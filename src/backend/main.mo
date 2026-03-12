import Map "mo:core/Map";
import Text "mo:core/Text";
import Time "mo:core/Time";
import Order "mo:core/Order";
import Array "mo:core/Array";
import Iter "mo:core/Iter";
import Principal "mo:core/Principal";
import Runtime "mo:core/Runtime";
import MixinAuthorization "authorization/MixinAuthorization";
import AccessControl "authorization/access-control";
import MixinStorage "blob-storage/Mixin";



actor {
  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);
  include MixinStorage();

  type LeaveType = {
    #noLeave;
    #halfDayFirstHalf;
    #halfDaySecondHalf;
    #fullDayLeave;
  };

  type AttendanceRecord = {
    date : Text;
    swipeIn : Text;
    swipeOut : Text;
    breakfastAtOffice : Bool;
    leaveType : LeaveType;
  };

  type UserProfile = {
    name : Text;
  };

  let attendanceRecords = Map.empty<(Principal, Text), AttendanceRecord>();
  let userProfiles = Map.empty<Principal, UserProfile>();

  module AttendanceRecord {
    public func compareByDate(a : AttendanceRecord, b : AttendanceRecord) : Order.Order {
      Text.compare(a.date, b.date);
    };
  };

  module PrincipalText {
    public func compare(a : (Principal, Text), b : (Principal, Text)) : Order.Order {
      switch (Principal.compare(a.0, b.0)) {
        case (#equal) { Text.compare(a.1, b.1) };
        case (order) { order };
      };
    };
  };

  type QueryRange = {
    startDate : Text;
    endDate : Text;
  };

  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can get profiles");
    };
    userProfiles.get(caller);
  };

  public query ({ caller }) func getUserProfile(user : Principal) : async ?UserProfile {
    if (caller != user and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Can only view your own profile");
    };
    userProfiles.get(user);
  };

  public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can save profiles");
    };
    userProfiles.add(caller, profile);
  };

  public shared ({ caller }) func saveRecord(record : AttendanceRecord) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can save attendance records");
    };
    if (record.date.size() == 0) {
      Runtime.trap("Invalid date");
    };
    attendanceRecords.add((caller, record.date), record);
  };

  public query ({ caller }) func getRecord(date : Text) : async ?AttendanceRecord {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can get attendance records");
    };
    attendanceRecords.get((caller, date));
  };

  public query ({ caller }) func getRecordsByDateRange(range : QueryRange) : async [AttendanceRecord] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can get attendance records");
    };
    func isInRange(record : AttendanceRecord) : Bool {
      (Text.compare(record.date, range.startDate) != #less) and (Text.compare(record.date, range.endDate) != #greater);
    };
    let allEntries = attendanceRecords.entries().toArray();
    let callerEntries = allEntries.filter(func((key, _record) : ((Principal, Text), AttendanceRecord)) : Bool {
      key.0 == caller;
    });
    let callerRecords = callerEntries.map(func((_key, record) : ((Principal, Text), AttendanceRecord)) : AttendanceRecord {
      record;
    });
    callerRecords.filter(func(record : AttendanceRecord) : Bool {
      isInRange(record);
    });
  };

  public shared ({ caller }) func deleteRecord(date : Text) : async Bool {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can delete attendance records");
    };
    switch (attendanceRecords.get((caller, date))) {
      case (null) {
        Runtime.trap("Record does not exist");
      };
      case (?_) {
        attendanceRecords.remove((caller, date));
        true;
      };
    };
  };

  public query ({ caller }) func getAllRecords() : async [AttendanceRecord] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can get attendance records");
    };
    let allEntries = attendanceRecords.entries().toArray();
    let callerEntries = allEntries.filter(func((key, _record) : ((Principal, Text), AttendanceRecord)) : Bool {
      key.0 == caller;
    });
    let callerRecords = callerEntries.map(func((_key, record) : ((Principal, Text), AttendanceRecord)) : AttendanceRecord {
      record;
    });
    callerRecords.sort(AttendanceRecord.compareByDate);
  };

  public type SwipeResponse = {
    message : Text;
    timestamp : Text;
    isSwipeIn : Bool;
  };

  public shared ({ caller }) func swipeAction(isSwipeIn : Bool, date : Text) : async SwipeResponse {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can perform swipe actions");
    };
    if (date.size() == 0) {
      Runtime.trap("Invalid date");
    };

    let timestamp = Time.now().toText();
    let existingRecord = attendanceRecords.get((caller, date));

    let updatedRecord : AttendanceRecord = switch (existingRecord, isSwipeIn) {
      case (null, _) {
        switch (isSwipeIn) {
          case (true) {
            {
              date;
              swipeIn = timestamp;
              swipeOut = "";
              breakfastAtOffice = false;
              leaveType = #noLeave;
            };
          };
          case (false) {
            Runtime.trap("Cannot swipe out without swiping in first!");
          };
        };
      };
      case (?record, true) {
        { record with swipeIn = timestamp };
      };
      case (?record, false) {
        { record with swipeOut = timestamp };
      };
    };

    attendanceRecords.add((caller, date), updatedRecord);

    {
      message = if (isSwipeIn) { "Swipe In recorded successfully" } else {
        "Swipe Out recorded successfully";
      };
      timestamp;
      isSwipeIn;
    };
  };
};
