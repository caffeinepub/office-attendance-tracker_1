import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { Calendar, CheckCircle, Clock, Gift } from "lucide-react";
import React from "react";
import { useCompOff } from "../hooks/useCompOff";
import { useHolidays } from "../hooks/useHolidays";
import { useGetAllRecords } from "../hooks/useQueries";
import { formatHoursDisplay, parseDateKey } from "../utils/hoursCalculation";

function SourceBadge({ source }: { source: "holiday" | "weekend" }) {
  const isHoliday = source === "holiday";
  return (
    <span
      className="px-2 py-0.5 rounded-full"
      style={{
        fontSize: 12,
        fontWeight: 500,
        backgroundColor: isHoliday
          ? "oklch(var(--primary) / 0.12)"
          : "oklch(var(--success) / 0.12)",
        color: isHoliday ? "oklch(var(--primary))" : "oklch(var(--success))",
      }}
    >
      {isHoliday ? "Holiday" : "Weekend"}
    </span>
  );
}

export default function CompOffBalance() {
  const { data: allRecords = [], isLoading } = useGetAllRecords();
  const { holidays } = useHolidays();
  const { balance, earnedBalance, totalUsed, entries } = useCompOff(
    allRecords,
    holidays,
  );

  if (isLoading) {
    return (
      <div className="px-4 pt-4 space-y-4">
        <Skeleton className="h-8 w-40 rounded-xl" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="page-enter px-4 pt-4 pb-6 space-y-5">
      {/* Header */}
      <div>
        <h2
          className="ios-number"
          style={{
            fontSize: 34,
            fontWeight: 700,
            letterSpacing: "-0.5px",
            color: "oklch(var(--foreground))",
          }}
        >
          Comp Off
        </h2>
        <p
          style={{
            fontSize: 15,
            color: "oklch(var(--muted-foreground))",
            marginTop: 2,
          }}
        >
          Compensatory off balance
        </p>
      </div>

      {/* Large Balance Display */}
      <div className="ios-card flex flex-col items-center py-6">
        <div
          className="flex items-center justify-center mb-2"
          style={{
            width: 60,
            height: 60,
            borderRadius: 16,
            backgroundColor:
              balance > 0
                ? "oklch(var(--success) / 0.12)"
                : "oklch(var(--secondary))",
          }}
        >
          <Gift
            style={{
              width: 28,
              height: 28,
              color:
                balance > 0
                  ? "oklch(var(--success))"
                  : "oklch(var(--muted-foreground))",
            }}
          />
        </div>
        <span
          className="ios-number"
          style={{
            fontSize: 48,
            fontWeight: 700,
            letterSpacing: "-1px",
            color:
              balance > 0
                ? "oklch(var(--success))"
                : "oklch(var(--muted-foreground))",
          }}
        >
          {balance}
        </span>
        <span
          style={{
            fontSize: 17,
            color: "oklch(var(--muted-foreground))",
            marginTop: 2,
          }}
        >
          {balance === 1 ? "day available" : "days available"}
        </span>
      </div>

      {/* Summary Card */}
      <div>
        <p className="ios-section-header">Summary</p>
        <div className="ios-card overflow-hidden">
          <div className="ios-row justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle
                style={{
                  width: 17,
                  height: 17,
                  color: "oklch(var(--success))",
                }}
              />
              <span style={{ fontSize: 17, color: "oklch(var(--foreground))" }}>
                Earned Total
              </span>
            </div>
            <span
              className="ios-number"
              style={{ fontSize: 17, color: "oklch(var(--success))" }}
            >
              {earnedBalance} {earnedBalance === 1 ? "day" : "days"}
            </span>
          </div>
          <div
            style={{
              height: "0.5px",
              backgroundColor: "oklch(var(--border) / 0.4)",
              marginLeft: 16,
            }}
          />
          <div className="ios-row justify-between">
            <div className="flex items-center gap-2">
              <Clock
                style={{
                  width: 17,
                  height: 17,
                  color: "oklch(var(--warning))",
                }}
              />
              <span style={{ fontSize: 17, color: "oklch(var(--foreground))" }}>
                Used Total
              </span>
            </div>
            <span
              className="ios-number"
              style={{ fontSize: 17, color: "oklch(var(--warning))" }}
            >
              {totalUsed} {totalUsed === 1 ? "day" : "days"}
            </span>
          </div>
          <div
            style={{
              height: "0.5px",
              backgroundColor: "oklch(var(--border) / 0.4)",
              marginLeft: 16,
            }}
          />
          <div className="ios-row justify-between">
            <div className="flex items-center gap-2">
              <Gift
                style={{
                  width: 17,
                  height: 17,
                  color: "oklch(var(--primary))",
                }}
              />
              <span style={{ fontSize: 17, color: "oklch(var(--foreground))" }}>
                Available Balance
              </span>
            </div>
            <span
              className="ios-number"
              style={{
                fontSize: 17,
                color:
                  balance > 0
                    ? "oklch(var(--success))"
                    : "oklch(var(--muted-foreground))",
              }}
            >
              {balance} {balance === 1 ? "day" : "days"}
            </span>
          </div>
        </div>
      </div>

      {/* Earned Entries List */}
      {entries.length > 0 ? (
        <div>
          <p className="ios-section-header">Earned Comp Off</p>
          <div className="ios-card overflow-hidden">
            {entries.map((entry, idx) => {
              const date = parseDateKey(entry.date);
              const expiryDate = parseDateKey(entry.expiresOn);
              return (
                <div key={`${entry.date}-${entry.source}`}>
                  {idx > 0 && (
                    <div
                      style={{
                        height: "0.5px",
                        backgroundColor: "oklch(var(--border) / 0.4)",
                        marginLeft: 16,
                      }}
                    />
                  )}
                  <div
                    className="ios-row justify-between"
                    data-ocid={`comp_off.item.${idx + 1}`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="flex items-center justify-center flex-shrink-0"
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 8,
                          backgroundColor:
                            entry.source === "holiday"
                              ? "oklch(var(--primary) / 0.1)"
                              : "oklch(var(--success) / 0.1)",
                        }}
                      >
                        <Calendar
                          style={{
                            width: 15,
                            height: 15,
                            color:
                              entry.source === "holiday"
                                ? "oklch(var(--primary))"
                                : "oklch(var(--success))",
                          }}
                        />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p
                            style={{
                              fontSize: 17,
                              color: "oklch(var(--foreground))",
                            }}
                          >
                            {format(date, "MMM d, yyyy")}
                          </p>
                          <SourceBadge source={entry.source} />
                        </div>
                        <p
                          style={{
                            fontSize: 13,
                            color: "oklch(var(--muted-foreground))",
                          }}
                        >
                          {formatHoursDisplay(entry.hoursWorked)} worked ·
                          Expires {format(expiryDate, "MMM d, yyyy")}
                        </p>
                      </div>
                    </div>
                    <span
                      className="ios-number"
                      style={{
                        fontSize: 17,
                        fontWeight: 600,
                        color: "oklch(var(--success))",
                        flexShrink: 0,
                        marginLeft: 8,
                      }}
                    >
                      +{entry.compOff}d
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div
          className="ios-card flex flex-col items-center text-center py-10"
          data-ocid="comp_off.empty_state"
        >
          <div
            className="flex items-center justify-center mb-4"
            style={{
              width: 56,
              height: 56,
              borderRadius: 14,
              backgroundColor: "oklch(var(--secondary))",
            }}
          >
            <Gift
              style={{
                width: 28,
                height: 28,
                color: "oklch(var(--muted-foreground))",
              }}
            />
          </div>
          <p
            style={{
              fontSize: 17,
              fontWeight: 600,
              color: "oklch(var(--foreground))",
            }}
          >
            No comp off earned yet
          </p>
          <p
            style={{
              fontSize: 15,
              color: "oklch(var(--muted-foreground))",
              marginTop: 4,
            }}
          >
            Work on holidays or weekends to earn compensatory off
          </p>
        </div>
      )}
    </div>
  );
}
