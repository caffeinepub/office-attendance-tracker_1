import { Button } from "@/components/ui/button";
import { format, parseISO } from "date-fns";
import { CalendarRange, Clock, Star, Trash2 } from "lucide-react";
import React, { useState } from "react";
import { useHolidays } from "../hooks/useHolidays";

export default function Holidays() {
  const { holidays, addHoliday, deleteHoliday } = useHolidays();
  const [dateInput, setDateInput] = useState("");
  const [nameInput, setNameInput] = useState("");
  const [error, setError] = useState("");

  const thisYear = new Date().getFullYear();
  const thisYearCount = holidays.filter((h) =>
    h.date.startsWith(String(thisYear)),
  ).length;

  const handleAdd = () => {
    if (!dateInput) {
      setError("Please select a date.");
      return;
    }
    if (holidays.some((h) => h.date === dateInput)) {
      setError("This date is already marked as a holiday.");
      return;
    }
    addHoliday(dateInput, nameInput.trim());
    setDateInput("");
    setNameInput("");
    setError("");
  };

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
          Holidays
        </h2>
        <p
          style={{
            fontSize: 15,
            color: "oklch(var(--muted-foreground))",
            marginTop: 2,
          }}
        >
          Company holidays reduce your weekly target
        </p>
      </div>

      {/* Add Holiday */}
      <div>
        <p className="ios-section-header">Add Holiday</p>
        <div className="ios-card overflow-hidden">
          <div className="px-4 py-3">
            <p
              style={{
                fontSize: 13,
                color: "oklch(var(--muted-foreground))",
                marginBottom: 6,
              }}
            >
              Date
            </p>
            <input
              type="date"
              value={dateInput}
              onChange={(e) => {
                setDateInput(e.target.value);
                setError("");
              }}
              className="w-full rounded-[10px] px-3 py-2.5 outline-none focus:ring-2 focus:ring-primary/30 ios-input-fill"
              style={{
                fontSize: 17,
                color: "oklch(var(--foreground))",
                border: "none",
              }}
              data-ocid="holiday.input"
            />
          </div>

          <div
            style={{
              height: "0.5px",
              backgroundColor: "oklch(var(--border) / 0.4)",
              marginLeft: 16,
            }}
          />

          <div className="px-4 py-3">
            <p
              style={{
                fontSize: 13,
                color: "oklch(var(--muted-foreground))",
                marginBottom: 6,
              }}
            >
              Name <span style={{ fontWeight: 400 }}>(optional)</span>
            </p>
            <input
              type="text"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              placeholder="e.g. Diwali, Christmas\u2026"
              className="w-full rounded-[10px] px-3 py-2.5 outline-none focus:ring-2 focus:ring-primary/30 ios-input-fill"
              style={{
                fontSize: 17,
                color: "oklch(var(--foreground))",
                border: "none",
              }}
              data-ocid="holiday.name_input"
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            />
          </div>

          {error && (
            <>
              <div
                style={{
                  height: "0.5px",
                  backgroundColor: "oklch(var(--border) / 0.4)",
                  marginLeft: 16,
                }}
              />
              <div className="ios-row">
                <p
                  style={{ fontSize: 13, color: "oklch(var(--destructive))" }}
                  data-ocid="holiday.error_state"
                >
                  {error}
                </p>
              </div>
            </>
          )}

          <div
            style={{
              height: "0.5px",
              backgroundColor: "oklch(var(--border) / 0.4)",
              marginLeft: 16,
            }}
          />

          <div className="px-4 py-3">
            <Button
              onClick={handleAdd}
              className="w-full rounded-xl font-semibold"
              style={{ height: 50, fontSize: 17 }}
              data-ocid="holiday.add_button"
            >
              <CalendarRange className="w-4 h-4 mr-2" />
              Add Holiday
            </Button>
          </div>
        </div>
      </div>

      {/* Summary */}
      <div>
        <p className="ios-section-header">Overview</p>
        <div className="ios-card overflow-hidden">
          <div className="ios-row justify-between">
            <span style={{ fontSize: 17, color: "oklch(var(--foreground))" }}>
              Holidays in {thisYear}
            </span>
            <span
              className="ios-number"
              style={{ fontSize: 17, color: "oklch(var(--primary))" }}
            >
              {thisYearCount}
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
            <span style={{ fontSize: 17, color: "oklch(var(--foreground))" }}>
              Total Recorded
            </span>
            <span
              className="ios-number"
              style={{ fontSize: 17, color: "oklch(var(--muted-foreground))" }}
            >
              {holidays.length}
            </span>
          </div>
        </div>
      </div>

      {/* Holiday List */}
      {holidays.length > 0 ? (
        <div>
          <p className="ios-section-header">All Holidays</p>
          <div className="ios-card overflow-hidden">
            {holidays.map((h, idx) => (
              <div key={h.date}>
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
                  data-ocid={`holiday.item.${idx + 1}`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="flex items-center justify-center flex-shrink-0"
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 8,
                        backgroundColor: "oklch(var(--primary) / 0.1)",
                      }}
                    >
                      <Star
                        style={{
                          width: 15,
                          height: 15,
                          color: "oklch(var(--primary))",
                        }}
                      />
                    </div>
                    <div>
                      <p
                        style={{
                          fontSize: 17,
                          color: "oklch(var(--foreground))",
                        }}
                      >
                        {format(parseISO(h.date), "MMM d, yyyy")}
                      </p>
                      {h.name && (
                        <p
                          style={{
                            fontSize: 13,
                            color: "oklch(var(--muted-foreground))",
                          }}
                        >
                          {h.name}
                        </p>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => deleteHoliday(h.date)}
                    className="tap-target flex items-center justify-center rounded-lg"
                    style={{
                      width: 36,
                      height: 36,
                      color: "oklch(var(--destructive))",
                    }}
                    aria-label="Delete holiday"
                    data-ocid={`holiday.delete_button.${idx + 1}`}
                  >
                    <Trash2 style={{ width: 17, height: 17 }} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div
          className="ios-card flex flex-col items-center text-center py-10"
          data-ocid="holiday.empty_state"
        >
          <div
            className="flex items-center justify-center mb-4"
            style={{
              width: 56,
              height: 56,
              borderRadius: 14,
              backgroundColor: "oklch(var(--primary) / 0.1)",
            }}
          >
            <CalendarRange
              style={{ width: 28, height: 28, color: "oklch(var(--primary))" }}
            />
          </div>
          <p
            style={{
              fontSize: 17,
              fontWeight: 600,
              color: "oklch(var(--foreground))",
            }}
          >
            No holidays added yet
          </p>
          <p
            style={{
              fontSize: 15,
              color: "oklch(var(--muted-foreground))",
              marginTop: 4,
            }}
          >
            Add holidays to reduce your weekly target
          </p>
        </div>
      )}

      {/* Info note */}
      <div
        className="flex items-start gap-3 rounded-xl px-4 py-3"
        style={{ backgroundColor: "oklch(var(--primary) / 0.07)" }}
      >
        <Clock
          style={{
            width: 16,
            height: 16,
            color: "oklch(var(--primary))",
            marginTop: 1,
            flexShrink: 0,
          }}
        />
        <p style={{ fontSize: 13, color: "oklch(var(--muted-foreground))" }}>
          Each holiday reduces the weekly 42h 30m target by{" "}
          <span style={{ fontWeight: 600, color: "oklch(var(--foreground))" }}>
            8h 30m
          </span>
          , similar to a full-day leave.
        </p>
      </div>
    </div>
  );
}
