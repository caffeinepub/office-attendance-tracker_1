import React, { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { Download, FileSpreadsheet, FileText, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { AttendanceRecord, LeaveType } from '../backend';
import {
  calculateDailyHours,
  formatHoursDisplay,
  getWeekRange,
  getMonthRange,
  getLeaveTypeLabel,
} from '../utils/hoursCalculation';
import { useGetAllRecords, useGetRecordsByDateRange } from '../hooks/useQueries';

function leaveTypeToStr(lt: LeaveType): 'noLeave' | 'halfDayFirstHalf' | 'halfDaySecondHalf' | 'fullDayLeave' {
  return lt as unknown as 'noLeave' | 'halfDayFirstHalf' | 'halfDaySecondHalf' | 'fullDayLeave';
}

type ExportRange = 'week' | 'month' | 'all';

interface ExportRow {
  Date: string;
  'Swipe In': string;
  'Swipe Out': string;
  Hours: string;
  Breakfast: string;
  'Leave Type': string;
}

function buildExportRows(records: AttendanceRecord[]): ExportRow[] {
  return records.map(r => {
    const leaveStr = leaveTypeToStr(r.leaveType as unknown as LeaveType);
    const hours = calculateDailyHours({
      date: r.date,
      swipeIn: r.swipeIn,
      swipeOut: r.swipeOut,
      breakfastAtOffice: r.breakfastAtOffice,
      leaveType: leaveStr,
    });
    return {
      Date: r.date,
      'Swipe In': r.swipeIn || '—',
      'Swipe Out': r.swipeOut || '—',
      Hours: formatHoursDisplay(hours),
      Breakfast: r.breakfastAtOffice ? 'Yes' : 'No',
      'Leave Type': getLeaveTypeLabel(leaveStr),
    };
  });
}

function downloadCSV(rows: ExportRow[], filename: string) {
  if (rows.length === 0) return;
  const headers = Object.keys(rows[0]) as (keyof ExportRow)[];
  const csvContent = [
    headers.join(','),
    ...rows.map(row =>
      headers.map(h => {
        const val = String(row[h]);
        return val.includes(',') ? `"${val}"` : val;
      }).join(',')
    ),
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function downloadXLSXFallback(rows: ExportRow[], filename: string) {
  // Simple XLSX-like format using CSV with .xlsx extension as fallback
  // Build a proper tab-separated values file that Excel can open
  if (rows.length === 0) return;
  const headers = Object.keys(rows[0]) as (keyof ExportRow)[];
  const tsvContent = [
    headers.join('\t'),
    ...rows.map(row => headers.map(h => String(row[h])).join('\t')),
  ].join('\n');

  const blob = new Blob([tsvContent], { type: 'application/vnd.ms-excel;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default function Export() {
  const today = new Date();
  const [range, setRange] = useState<ExportRange>('month');
  const [isExporting, setIsExporting] = useState<'csv' | 'xlsx' | null>(null);

  const weekRange = getWeekRange(today);
  const monthRange = getMonthRange(today);

  const { data: allRecords = [] } = useGetAllRecords();
  const { data: weekRecords = [] } = useGetRecordsByDateRange(weekRange.start, weekRange.end);
  const { data: monthRecords = [] } = useGetRecordsByDateRange(monthRange.start, monthRange.end);

  const selectedRecords = useMemo(() => {
    switch (range) {
      case 'week': return weekRecords;
      case 'month': return monthRecords;
      case 'all': return allRecords;
    }
  }, [range, weekRecords, monthRecords, allRecords]);

  const rangeLabel = useMemo(() => {
    switch (range) {
      case 'week': return `Week of ${format(new Date(weekRange.start), 'MMM d')}`;
      case 'month': return format(today, 'MMMM yyyy');
      case 'all': return 'All Records';
    }
  }, [range, weekRange.start, today]);

  const handleCSV = async () => {
    setIsExporting('csv');
    try {
      const rows = buildExportRows(selectedRecords);
      downloadCSV(rows, `swipetrack-${range}-${format(today, 'yyyy-MM-dd')}.csv`);
    } finally {
      setIsExporting(null);
    }
  };

  const handleXLSX = async () => {
    setIsExporting('xlsx');
    try {
      const rows = buildExportRows(selectedRecords);
      downloadXLSXFallback(rows, `swipetrack-${range}-${format(today, 'yyyy-MM-dd')}.xlsx`);
    } finally {
      setIsExporting(null);
    }
  };

  return (
    <div className="page-enter px-4 py-5 space-y-5">
      <div>
        <h2 className="text-2xl font-display font-bold text-foreground">Export</h2>
        <p className="text-sm text-muted-foreground mt-0.5">Download your attendance data</p>
      </div>

      {/* Range Selector */}
      <div className="app-card p-4 space-y-3">
        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Date Range</Label>
        <Select value={range} onValueChange={v => setRange(v as ExportRange)}>
          <SelectTrigger className="h-12 rounded-xl bg-secondary border-0">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="rounded-xl">
            <SelectItem value="week">Current Week</SelectItem>
            <SelectItem value="month">Current Month</SelectItem>
            <SelectItem value="all">All Records</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex items-center justify-between bg-secondary rounded-xl px-4 py-3">
          <span className="text-sm text-muted-foreground">Records to export</span>
          <span className="text-sm font-bold text-foreground">{selectedRecords.length}</span>
        </div>
        <div className="flex items-center justify-between bg-secondary rounded-xl px-4 py-3">
          <span className="text-sm text-muted-foreground">Range</span>
          <span className="text-sm font-bold text-foreground">{rangeLabel}</span>
        </div>
      </div>

      {/* Columns Preview */}
      <div className="app-card p-4 space-y-3">
        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Included Columns</Label>
        <div className="flex flex-wrap gap-2">
          {['Date', 'Swipe In', 'Swipe Out', 'Hours', 'Breakfast', 'Leave Type'].map(col => (
            <span key={col} className="text-xs bg-primary/10 text-primary font-medium px-2.5 py-1 rounded-full">
              {col}
            </span>
          ))}
        </div>
      </div>

      {/* Export Buttons */}
      <div className="space-y-3">
        <Button
          onClick={handleCSV}
          disabled={isExporting !== null || selectedRecords.length === 0}
          variant="outline"
          className="w-full h-14 text-base font-semibold rounded-2xl border-border"
          size="lg"
        >
          {isExporting === 'csv' ? (
            <span className="flex items-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin" />
              Exporting CSV...
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              Export as CSV
            </span>
          )}
        </Button>

        <Button
          onClick={handleXLSX}
          disabled={isExporting !== null || selectedRecords.length === 0}
          className="w-full h-14 text-base font-semibold rounded-2xl shadow-glow"
          size="lg"
        >
          {isExporting === 'xlsx' ? (
            <span className="flex items-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin" />
              Exporting Excel...
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5" />
              Export as Excel
            </span>
          )}
        </Button>

        {selectedRecords.length === 0 && (
          <p className="text-center text-sm text-muted-foreground">
            No records found for the selected range.
          </p>
        )}
      </div>

      {/* Preview Table */}
      {selectedRecords.length > 0 && (
        <div className="app-card p-4 space-y-3">
          <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Preview ({Math.min(selectedRecords.length, 5)} of {selectedRecords.length})
          </Label>
          <div className="overflow-x-auto -mx-1">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 px-2 text-muted-foreground font-semibold">Date</th>
                  <th className="text-left py-2 px-2 text-muted-foreground font-semibold">In</th>
                  <th className="text-left py-2 px-2 text-muted-foreground font-semibold">Out</th>
                  <th className="text-left py-2 px-2 text-muted-foreground font-semibold">Hours</th>
                </tr>
              </thead>
              <tbody>
                {selectedRecords.slice(0, 5).map(r => {
                  const leaveStr = leaveTypeToStr(r.leaveType as unknown as LeaveType);
                  const hours = calculateDailyHours({
                    date: r.date,
                    swipeIn: r.swipeIn,
                    swipeOut: r.swipeOut,
                    breakfastAtOffice: r.breakfastAtOffice,
                    leaveType: leaveStr,
                  });
                  return (
                    <tr key={r.date} className="border-b border-border/50">
                      <td className="py-2 px-2 font-medium text-foreground">{r.date}</td>
                      <td className="py-2 px-2 text-muted-foreground">{r.swipeIn || '—'}</td>
                      <td className="py-2 px-2 text-muted-foreground">{r.swipeOut || '—'}</td>
                      <td className="py-2 px-2 font-semibold text-primary">{formatHoursDisplay(hours)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="pt-4 pb-2 text-center">
        <p className="text-xs text-muted-foreground">
          © {new Date().getFullYear()} SwipeTrack Pro · Built with ❤️ using{' '}
          <a
            href={`https://caffeine.ai/?utm_source=Caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname || 'swipetrack-pro')}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline font-medium"
          >
            caffeine.ai
          </a>
        </p>
      </div>
    </div>
  );
}
