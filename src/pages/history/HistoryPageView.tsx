import { ArrowLeft, ChevronDown, Clock, Crosshair, History, ListChecks, MousePointerClick, Trophy } from "lucide-react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { useEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from "react";
import { GlassCard } from "@/components/home/GlassCard";
import { ParallaxBackground } from "@/components/home/ParallaxBackground";
import { ResultTrendChart } from "@/components/training/ResultTrendChart";
import { TrainingAnalyticsChart } from "@/components/history/TrainingAnalyticsChart";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageStatCard } from "@/components/common/PageStatCard";
import { cn } from "@/lib/utils";
import { historyPageStyles as styles } from "./historyPage.styles";
import type { TrainingHistoryRecord } from "./historyRecords";
import type { HistoryPageViewModel } from "./useHistoryPage";

interface HistoryPageViewProps {
  viewModel: HistoryPageViewModel;
}

const filterInputClassName =
  "h-9 w-full min-w-0 rounded-xl border border-white/10 bg-white/[0.04] px-3 text-xs text-foreground outline-none shadow-[0_8px_24px_rgba(0,0,0,0.22),inset_0_1px_0_rgba(255,255,255,0.05)] backdrop-blur-xl transition-all duration-200 placeholder:text-muted-foreground/60 hover:border-white/20 hover:bg-white/[0.06] focus:border-primary/45 focus:bg-white/[0.07] focus:shadow-[0_0_0_3px_rgba(0,200,200,0.08)]";
const dropdownButtonClassName = cn(filterInputClassName, "flex items-center justify-between gap-2 text-left");
const datePickerPanelWidth = 288;
const datePickerPanelEstimatedHeight = 360;
const datePickerPanelGap = 8;
const datePickerViewportMargin = 12;
const chartLegendItems = [
  { color: "#00d5ff", key: "analytics.accuracy", fallback: "命中率趋势" },
  { color: "#f5a524", key: "records.reaction", fallback: "平均反应时间" },
];

export function HistoryPageView({ viewModel }: HistoryPageViewProps) {
  const {
    t,
    filteredRecords,
    modeTabs,
    modeRecords,
    paginatedRecords,
    recordPage,
    recordPageCount,
    recordPageSize,
    selectedModeId,
    selectedModeName,
    selectedRecord,
    labels,
    accuracy,
    averageReaction,
    stats,
    trendRecords,
    dateRange,
    formatDateTime,
    selectMode,
    selectRecord,
    setRecordPage,
    updateDateRange,
    updateRecordPageSize,
  } = viewModel;

  return (
    <main className={styles.page}>
      <ParallaxBackground />
      <Button asChild variant="outline" className={styles.fixedBackHomeButton}>
        <Link to="/">
          <ArrowLeft className="h-4 w-4" />
          {t("actions.backHome", { defaultValue: "返回首页" })}
        </Link>
      </Button>

      <div className={styles.content}>
        <div className={styles.topBar}>
          <div className={styles.modeTabs} aria-label={t("modes.tabs", { defaultValue: "训练模式筛选" })}>
            {modeTabs.map((mode) => (
              <Button
                key={mode.id}
                type="button"
                variant={mode.id === selectedModeId ? "default" : "outline"}
                className={cn(
                  "min-w-0 rounded-full px-3 py-2 text-xs sm:px-4",
                  mode.id !== selectedModeId && "border-white/10 bg-white/[0.03] backdrop-blur-xl",
                )}
                onClick={() => selectMode(mode.id)}
              >
                <span className="truncate">{mode.name}</span>
                <Badge variant="secondary" className="ml-1 shrink-0 border border-white/10 bg-black/20">
                  {mode.count}
                </Badge>
              </Button>
            ))}
          </div>
        </div>

        <div className={styles.mainGrid}>
          <aside className={styles.summaryColumn}>
            <PageStatCard
              compact
              icon={Trophy}
              label={t("analytics.bestScore", { defaultValue: "最高得分" })}
              value={stats.bestScore}
            />
            <PageStatCard
              compact
              icon={Crosshair}
              label={t("analytics.bestHits", { defaultValue: "最高命中" })}
              value={stats.bestHits}
            />
            <PageStatCard
              compact
              icon={Clock}
              label={t("analytics.avgReaction", { defaultValue: "平均反应" })}
              value={stats.avgReaction ? `${stats.avgReaction}ms` : "-"}
            />
            <PageStatCard compact icon={MousePointerClick} label={t("analytics.totalHits", { defaultValue: "总命中数" })} value={stats.totalHits} />
            <PageStatCard compact icon={History} label={t("analytics.sessions", { defaultValue: "训练次数" })} value={stats.sessions} />
          </aside>

          <div className={styles.centerColumn}>
            <GlassCard intensity="high" className="px-3 py-2">
              <div className="flex flex-wrap items-center gap-3">
                <DateRangeInputs
                  dateRange={dateRange}
                  endLabel={t("filters.endDate", { defaultValue: "结束日期" })}
                  onChange={updateDateRange}
                  startLabel={t("filters.startDate", { defaultValue: "开始日期" })}
                  t={t}
                />
              </div>
            </GlassCard>

            <GlassCard intensity="high" className="p-4">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
                  <h2 className="text-lg font-semibold">{t("analytics.modeTrendTitle", { defaultValue: "模式趋势" })}</h2>
                  <p className="text-sm text-muted-foreground">
                    {t("analytics.modeTrend", { defaultValue: "当前模式的平均反应时间与命中率趋势" })}
                  </p>
                </div>
                <Badge variant="secondary" className="border border-accent/20 bg-accent/10 text-accent">
                  {selectedModeName} · {t("analytics.sessions", { defaultValue: "训练次数" })}：{trendRecords.length}
                </Badge>
              </div>
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <ChartLegend t={t} />
              </div>
              {trendRecords.length ? (
                <TrainingAnalyticsChart
                  labels={labels}
                  accuracy={accuracy}
                  averageReaction={averageReaction}
                  accuracyLabel={t("analytics.accuracy", { defaultValue: "命中率趋势" })}
                  averageReactionLabel={t("records.reaction", { defaultValue: "平均反应时间" })}
                  className="h-[220px] sm:h-[240px]"
                />
              ) : (
                <EmptyState
                  title={t("empty.filteredTrendTitle", { defaultValue: "当前日期范围暂无趋势数据" })}
                  description={t("empty.filteredTrendDescription", { defaultValue: "调整上方日期筛选，或完成更多训练后再回来查看趋势。" })}
                  actionLabel={t("empty.startTraining", { defaultValue: "开始训练" })}
                />
              )}
            </GlassCard>

            <GlassCard intensity="high" className="flex min-h-0 flex-1 flex-col overflow-hidden p-4">
              <div className="flex h-full min-h-0 flex-col">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
                    <h2 className="text-lg font-semibold">{t("recent.title", { defaultValue: "近期训练记录" })}</h2>
                    <p className="text-sm text-muted-foreground">
                      {t("recent.subtitle", { defaultValue: "跨模式按完成时间排序，点击可查看详情。" })}
                    </p>
                  </div>
                  <Badge variant="outline" className="border-white/10 bg-white/[0.03]">
                    {filteredRecords.length}
                  </Badge>
                </div>

                {filteredRecords.length ? (
                  <>
                    <RecordTable
                      records={paginatedRecords}
                      selectedRecordId={selectedRecord?.id ?? null}
                      formatDateTime={formatDateTime}
                      getModeName={viewModel.getModeName}
                      onSelectRecord={selectRecord}
                      t={t}
                    />
                    <RecordPagination
                      page={recordPage}
                      pageCount={recordPageCount}
                      pageSize={recordPageSize}
                      pageSizeOptions={[5, 9, 20, 50]}
                      total={filteredRecords.length}
                      onPageChange={setRecordPage}
                      onPageSizeChange={updateRecordPageSize}
                      t={t}
                    />
                  </>
                ) : (
                  <>
                    <RecordTable
                      records={[]}
                      selectedRecordId={null}
                      formatDateTime={formatDateTime}
                      getModeName={viewModel.getModeName}
                      onSelectRecord={selectRecord}
                      t={t}
                    />
                    <RecordPagination
                      page={recordPage}
                      pageCount={recordPageCount}
                      pageSize={recordPageSize}
                      pageSizeOptions={[5, 9, 20, 50]}
                      total={filteredRecords.length}
                      onPageChange={setRecordPage}
                      onPageSizeChange={updateRecordPageSize}
                      t={t}
                    />
                  </>
                )}
              </div>
            </GlassCard>
          </div>

          <GlassCard intensity="high" className={cn(styles.detailColumn, "overflow-hidden p-3 sm:p-4 lg:col-start-2 xl:col-start-auto")}>
            <div className="flex h-full min-h-0 flex-col">
              <div className="mb-3 flex shrink-0 items-center justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="text-lg font-semibold">{t("details.title", { defaultValue: "单次记录详情" })}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {t("details.subtitle", { defaultValue: "数据与训练结束页保持一致。" })}
                  </p>
                </div>
                <MousePointerClick className="h-5 w-5 shrink-0 text-primary" />
              </div>

              {selectedRecord ? (
                <RecordDetails
                  record={selectedRecord}
                  formatDateTime={formatDateTime}
                  getModeName={viewModel.getModeName}
                  t={t}
                />
              ) : (
                <EmptyState
                  title={t("empty.detailTitle", { defaultValue: "还没有可查看的详情" })}
                  description={t("empty.detailDescription", { defaultValue: "完成训练后可在这里复盘命中、命中率、平均反应和分布曲线。" })}
                  actionLabel={t("empty.startTraining", { defaultValue: "开始训练" })}
                />
              )}
            </div>
          </GlassCard>
        </div>
      </div>
    </main>
  );
}

interface DateRangeInputsProps {
  dateRange: {
    endDate: string;
    startDate: string;
  };
  endLabel: string;
  onChange: (partial: Partial<{ endDate: string; startDate: string }>) => void;
  startLabel: string;
  t: HistoryPageViewModel["t"];
}

function DateRangeInputs({ dateRange, endLabel, onChange, startLabel, t }: DateRangeInputsProps) {
  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <FilterField className="w-[190px]" label={startLabel}>
        <DatePickerInput
          value={dateRange.startDate}
          label={startLabel}
          onChange={(value) => onChange({ startDate: value })}
          t={t}
          className="h-6 px-2 text-[11px]"
        />
      </FilterField>
      <FilterField className="w-[190px]" label={endLabel}>
        <DatePickerInput
          value={dateRange.endDate}
          label={endLabel}
          onChange={(value) => onChange({ endDate: value })}
          t={t}
          className="h-6 px-2 text-[11px]"
        />
      </FilterField>
    </div>
  );
}

function ChartLegend({ t }: { t: HistoryPageViewModel["t"] }) {
  return (
    <div className="flex items-center justify-end gap-4 text-xs text-muted-foreground">
      {chartLegendItems.map((item) => (
        <span key={item.key} className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full shadow-[0_0_12px_currentColor]" style={{ backgroundColor: item.color, color: item.color }} />
          {t(item.key, { defaultValue: item.fallback })}
        </span>
      ))}
    </div>
  );
}

interface FilterFieldProps {
  children: ReactNode;
  className?: string;
  label: string;
}

function FilterField({ children, className, label }: FilterFieldProps) {
  return (
    <label className={cn("flex min-w-0 shrink-0 items-center gap-2", className)}>
      <span className="shrink-0 whitespace-nowrap text-right text-sm text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

interface DropdownOption {
  label: string;
  value: string;
}

interface GlassDropdownProps {
  className?: string;
  onChange: (value: string) => void;
  options: DropdownOption[];
  placement?: "bottom" | "top";
  value: string;
}

function GlassDropdown({ className, onChange, options, placement = "bottom", value }: GlassDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const selectedOption = options.find((option) => option.value === value) ?? options[0];

  useClickOutside(rootRef, () => setIsOpen(false));

  return (
    <div ref={rootRef} className={cn("relative min-w-0", className)}>
      <button
        type="button"
        className={dropdownButtonClassName}
        onClick={() => setIsOpen((current) => !current)}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        <span className="truncate">{selectedOption?.label}</span>
        <ChevronDown className={cn("h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform", isOpen && "rotate-180 text-primary")} />
      </button>
      <div
        className={cn(
          "absolute right-0 z-30 max-h-64 w-full min-w-36 overflow-y-auto rounded-2xl border border-white/10 bg-background/80 p-1.5",
          "shadow-[0_18px_60px_rgba(0,0,0,0.55),0_0_70px_rgba(0,200,200,0.06),inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-2xl",
          "transition-all duration-200",
          placement === "top" ? "bottom-full mb-2 origin-bottom-right" : "mt-2 origin-top-right",
          isOpen ? "pointer-events-auto translate-y-0 scale-100 opacity-100" : "pointer-events-none -translate-y-1 scale-95 opacity-0",
        )}
        role="listbox"
      >
        <div className="pointer-events-none absolute inset-x-4 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
        {options.map((option) => {
          const isSelected = option.value === value;

          return (
            <button
              key={option.value}
              type="button"
              role="option"
              aria-selected={isSelected}
              onClick={() => {
                onChange(option.value);
                setIsOpen(false);
              }}
              className={cn(
                "relative flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-xs transition-all duration-200",
                isSelected
                  ? "bg-primary/12 text-primary shadow-[inset_0_0_0_1px_rgba(0,200,200,0.16)]"
                  : "text-muted-foreground hover:bg-white/[0.06] hover:text-foreground",
              )}
            >
              <span className="truncate">{option.label}</span>
              <span className={cn("ml-2 h-1.5 w-1.5 rounded-full bg-primary transition-opacity", isSelected ? "opacity-100" : "opacity-0")} />
            </button>
          );
        })}
      </div>
    </div>
  );
}

interface DatePickerInputProps {
  className?: string;
  label: string;
  onChange: (value: string) => void;
  t: HistoryPageViewModel["t"];
  value: string;
}

function DatePickerInput({ className, label, onChange, t, value }: DatePickerInputProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [visibleMonth, setVisibleMonth] = useState(() => getMonthDate(value));
  const [panelPosition, setPanelPosition] = useState({ left: datePickerViewportMargin, top: datePickerViewportMargin });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const days = useMemo(() => getCalendarDays(visibleMonth), [visibleMonth]);

  const updatePanelPosition = () => {
    const rect = buttonRef.current?.getBoundingClientRect();

    if (!rect) {
      return;
    }

    const panelHeight = panelRef.current?.offsetHeight || datePickerPanelEstimatedHeight;
    const maxLeft = Math.max(datePickerViewportMargin, window.innerWidth - datePickerPanelWidth - datePickerViewportMargin);
    const left = Math.min(Math.max(datePickerViewportMargin, rect.left), maxLeft);
    const bottomTop = rect.bottom + datePickerPanelGap;
    const top =
      bottomTop + panelHeight + datePickerViewportMargin <= window.innerHeight
        ? bottomTop
        : Math.max(datePickerViewportMargin, rect.top - panelHeight - datePickerPanelGap);

    setPanelPosition({
      left,
      top,
    });
  };

  useEffect(() => {
    if (!isOpen) {
      setVisibleMonth(getMonthDate(value));
    }
  }, [isOpen, value]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;

      if (!rootRef.current?.contains(target) && !panelRef.current?.contains(target)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    updatePanelPosition();
    const animationFrame = window.requestAnimationFrame(updatePanelPosition);
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener("resize", updatePanelPosition);
    window.addEventListener("scroll", updatePanelPosition, true);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("resize", updatePanelPosition);
      window.removeEventListener("scroll", updatePanelPosition, true);
      window.cancelAnimationFrame(animationFrame);
    };
  }, [isOpen]);

  const panel = (
    <div
      ref={panelRef}
      style={{
        left: panelPosition.left,
        top: panelPosition.top,
      }}
      className={cn(
        "fixed z-[100] w-[18rem] origin-top-left rounded-2xl border border-white/10 bg-background/85 p-3",
        "shadow-[0_18px_60px_rgba(0,0,0,0.55),0_0_70px_rgba(0,200,200,0.06),inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-2xl",
        "transition-all duration-200",
        isOpen ? "pointer-events-auto translate-y-0 scale-100 opacity-100" : "pointer-events-none -translate-y-1 scale-95 opacity-0",
      )}
    >
      <div className="mb-3 flex items-center justify-between">
        <button
          type="button"
          className="rounded-lg px-2 py-1 text-sm text-muted-foreground transition-colors hover:bg-white/[0.06] hover:text-foreground"
          onClick={() => setVisibleMonth((current) => addMonths(current, -1))}
        >
          ‹
        </button>
        <div className="text-sm font-medium text-foreground">{formatMonthTitle(visibleMonth)}</div>
        <button
          type="button"
          className="rounded-lg px-2 py-1 text-sm text-muted-foreground transition-colors hover:bg-white/[0.06] hover:text-foreground"
          onClick={() => setVisibleMonth((current) => addMonths(current, 1))}
        >
          ›
        </button>
      </div>
      <div className="mb-1 grid grid-cols-7 gap-1 text-center text-[0.65rem] uppercase tracking-wide text-muted-foreground">
        {["日", "一", "二", "三", "四", "五", "六"].map((day) => (
          <div key={day}>{day}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {days.map((day) => {
          const dateValue = formatDateValue(day);
          const isCurrentMonth = day.getMonth() === visibleMonth.getMonth();
          const isSelected = dateValue === value;

          return (
            <button
              key={dateValue}
              type="button"
              onClick={() => {
                onChange(dateValue);
                setIsOpen(false);
              }}
              className={cn(
                "flex h-8 items-center justify-center rounded-lg text-xs transition-all",
                isSelected
                  ? "bg-primary text-primary-foreground shadow-[0_0_20px_rgba(0,200,200,0.25)]"
                  : "hover:bg-white/[0.07] hover:text-foreground",
                isCurrentMonth ? "text-foreground" : "text-muted-foreground/40",
              )}
            >
              {day.getDate()}
            </button>
          );
        })}
      </div>
      <button
        type="button"
        className="mt-3 w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-muted-foreground transition-colors hover:bg-white/[0.07] hover:text-foreground"
        onClick={() => {
          const today = formatDateValue(new Date());
          onChange(today);
          setIsOpen(false);
        }}
      >
        {t("filters.today", { defaultValue: "今天" })}
      </button>
    </div>
  );

  return (
    <div ref={rootRef} className="relative min-w-0 flex-1">
      <button
        ref={buttonRef}
        type="button"
        className={cn(dropdownButtonClassName, className)}
        onClick={() => {
          updatePanelPosition();
          setIsOpen((current) => !current);
        }}
        aria-expanded={isOpen}
        aria-label={label}
      >
        <span>{formatDateForDisplay(value)}</span>
        <ChevronDown className={cn("h-3 w-3 text-muted-foreground transition-transform", isOpen && "rotate-180 text-primary")} />
      </button>

      {isOpen ? createPortal(panel, document.body) : null}
    </div>
  );
}

function useClickOutside<T extends HTMLElement>(ref: RefObject<T | null>, onOutside: () => void) {
  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (!ref.current?.contains(event.target as Node)) {
        onOutside();
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onOutside();
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onOutside, ref]);
}

function getMonthDate(value: string) {
  const [year, month] = value.split("-").map(Number);
  const date = new Date(Number.isFinite(year) ? year : new Date().getFullYear(), Number.isFinite(month) ? month - 1 : new Date().getMonth(), 1);

  return Number.isNaN(date.getTime()) ? new Date() : date;
}

function getCalendarDays(monthDate: Date) {
  const firstDay = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  const startDate = new Date(firstDay);
  startDate.setDate(firstDay.getDate() - firstDay.getDay());

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + index);
    return date;
  });
}

function addMonths(date: Date, amount: number) {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1);
}

function formatDateValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatDateForDisplay(value: string) {
  return value.replaceAll("-", "/");
}

function formatMonthTitle(date: Date) {
  return `${date.getFullYear()} / ${String(date.getMonth() + 1).padStart(2, "0")}`;
}

interface RecordPaginationProps {
  page: number;
  pageCount: number;
  pageSize: number;
  pageSizeOptions: number[];
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  t: HistoryPageViewModel["t"];
}

function RecordPagination({
  page,
  pageCount,
  pageSize,
  pageSizeOptions,
  total,
  onPageChange,
  onPageSizeChange,
  t,
}: RecordPaginationProps) {
  return (
    <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-3 text-xs text-muted-foreground">
      <div>
        {t("pagination.total", { defaultValue: "共 {{count}} 条" }).replace("{{count}}", String(total))}
      </div>
      <div className="flex items-center gap-2">
        <span>{t("pagination.pageSize", { defaultValue: "每页" })}</span>
        <GlassDropdown
          className="w-20"
          value={String(pageSize)}
          options={pageSizeOptions.map((option) => ({ label: String(option), value: String(option) }))}
          placement="top"
          onChange={(value) => onPageSizeChange(Number(value))}
        />
        <Button
          type="button"
          variant="outline"
          className="h-8 px-3 text-xs"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          {t("pagination.prev", { defaultValue: "上一页" })}
        </Button>
        <span className="min-w-12 text-center text-foreground">
          {page} / {pageCount}
        </span>
        <Button
          type="button"
          variant="outline"
          className="h-8 px-3 text-xs"
          disabled={page >= pageCount}
          onClick={() => onPageChange(page + 1)}
        >
          {t("pagination.next", { defaultValue: "下一页" })}
        </Button>
      </div>
    </div>
  );
}

interface RecordTableProps {
  records: TrainingHistoryRecord[];
  selectedRecordId: string | null;
  formatDateTime: (dateValue: string) => string;
  getModeName: (record: TrainingHistoryRecord) => string;
  onSelectRecord: (record: TrainingHistoryRecord) => void;
  t: HistoryPageViewModel["t"];
}

function RecordTable({ records, selectedRecordId, formatDateTime, getModeName, onSelectRecord, t }: RecordTableProps) {
  const formatDuration = (seconds: number) => `${seconds}s`;
  const formatReaction = (milliseconds: number) => (milliseconds ? `${milliseconds}ms` : "-");
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [hasVerticalOverflow, setHasVerticalOverflow] = useState(false);

  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer) {
      return;
    }

    const updateOverflowState = () => {
      setHasVerticalOverflow(scrollContainer.scrollHeight > scrollContainer.clientHeight + 1);
    };
    const resizeObserver = new ResizeObserver(updateOverflowState);

    updateOverflowState();
    resizeObserver.observe(scrollContainer);

    return () => resizeObserver.disconnect();
  }, [records.length]);

  return (
    <div className={styles.tableWrapper}>
      <div className={cn(styles.tableHeader, hasVerticalOverflow && styles.tableHeaderWithScrollbar)}>
        <table className="w-full table-fixed text-center text-[11px] sm:text-xs">
          <colgroup>
            <col className="w-[24%]" />
            <col className="w-[16%]" />
            <col className="w-[11%]" />
            <col className="w-[11%]" />
            <col className="w-[10%]" />
            <col className="w-[12%]" />
            <col className="w-[16%]" />
          </colgroup>
          <thead className="text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-2 py-2.5 align-middle">{t("records.date", { defaultValue: "日期" })}</th>
              <th className="px-2 py-2.5 align-middle">{t("records.mode", { defaultValue: "模式" })}</th>
              <th className="px-2 py-2.5 align-middle">{t("records.duration", { defaultValue: "耗时" })}</th>
              <th className="px-2 py-2.5 align-middle">{t("records.score", { defaultValue: "分数" })}</th>
              <th className="px-2 py-2.5 align-middle">{t("records.hits", { defaultValue: "命中" })}</th>
              <th className="px-2 py-2.5 align-middle">{t("records.accuracy", { defaultValue: "命中率" })}</th>
              <th className="px-2 py-2.5 align-middle">{t("records.reaction", { defaultValue: "平均反应时间" })}</th>
            </tr>
          </thead>
        </table>
      </div>
      <div ref={scrollContainerRef} className={styles.tableBodyScroll}>
        <table className="w-full table-fixed text-center text-[11px] sm:text-xs">
          <colgroup>
            <col className="w-[24%]" />
            <col className="w-[16%]" />
            <col className="w-[11%]" />
            <col className="w-[11%]" />
            <col className="w-[10%]" />
            <col className="w-[12%]" />
            <col className="w-[16%]" />
          </colgroup>
          <tbody className="divide-y divide-white/10">
            {records.map((record) => (
              <tr
                key={record.id}
                className={cn(
                  "cursor-pointer transition-colors hover:bg-white/[0.04]",
                  selectedRecordId === record.id && "bg-primary/10",
                )}
                onClick={() => onSelectRecord(record)}
              >
                <td className="truncate px-2 py-2.5 align-middle text-muted-foreground">{formatDateTime(record.completedAt)}</td>
                <td className="truncate px-2 py-2.5 align-middle">{getModeName(record)}</td>
                <td className="truncate px-2 py-2.5 align-middle text-muted-foreground">{formatDuration(record.durationSeconds)}</td>
                <td className="truncate px-2 py-2.5 align-middle font-semibold text-primary">{record.score}</td>
                <td className="truncate px-2 py-2.5 align-middle">{record.hits}</td>
                <td className="truncate px-2 py-2.5 align-middle">{record.accuracy}%</td>
                <td className="truncate px-2 py-2.5 align-middle">{formatReaction(record.averageReactionMs)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
interface RecordDetailsProps {
  record: TrainingHistoryRecord;
  formatDateTime: (dateValue: string) => string;
  getModeName: (record: TrainingHistoryRecord) => string;
  t: HistoryPageViewModel["t"];
}

function RecordDetails({ record, formatDateTime, getModeName, t }: RecordDetailsProps) {
  const detailChartData = useMemo(
    () => ({
      seconds: record.timeline.map((point) => point.second),
      trendAccuracy: record.timeline.map((point) => point.accuracy),
      trendHits: record.timeline.map((point) => point.hits),
      trendReaction: record.timeline.map((point) => point.averageReaction),
    }),
    [record.timeline],
  );

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      <div className="mb-3 shrink-0 rounded-xl border border-white/10 bg-black/20 p-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-[0.68rem] uppercase tracking-[0.18em] text-primary">{getModeName(record)}</div>
            <div className="mt-1 text-xl font-bold">{record.score}</div>
            <div className="mt-0.5 text-xs text-muted-foreground">
              {formatDateTime(record.completedAt)} · {record.durationSeconds}s
            </div>
          </div>
          <Badge variant="outline" className="border-white/10 bg-white/[0.03]">
            <ListChecks className="h-3.5 w-3.5" />
            {t("details.savedLocally", { defaultValue: "本地保存" })}
          </Badge>
        </div>
      </div>

      <div className={cn(styles.detailStatsGrid, "shrink-0")}>
        <DetailStat label={t("records.hits", { defaultValue: "命中" })} value={record.hits} />
        <DetailStat label={t("records.accuracy", { defaultValue: "命中率" })} value={`${record.accuracy}%`} />
        <DetailStat
          label={t("records.reaction", { defaultValue: "平均反应" })}
          value={record.averageReactionMs ? `${record.averageReactionMs}ms` : "-"}
        />
        <DetailStat label={t("records.shots", { defaultValue: "射击" })} value={record.shots} />
      </div>

      <div className="flex min-h-[260px] flex-1 rounded-xl border border-white/10 bg-black/20 p-2.5">
        <ResultTrendChart
          seconds={detailChartData.seconds}
          accuracy={detailChartData.trendAccuracy}
          hits={detailChartData.trendHits}
          averageReaction={detailChartData.trendReaction}
          accuracyLabel={t("details.accuracyTrend", { defaultValue: "命中率分布" })}
          className="h-full min-h-0 flex-1"
          hitsLabel={t("details.hitTrend", { defaultValue: "命中分布" })}
          averageReactionLabel={t("details.reactionTrend", { defaultValue: "平均反应分布" })}
        />
      </div>
    </div>
  );
}

interface DetailStatProps {
  label: string;
  value: string | number;
}

function DetailStat({ label, value }: DetailStatProps) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/20 p-2.5">
      <div className="text-[0.65rem] uppercase tracking-[0.14em] text-muted-foreground">{label}</div>
      <div className="mt-1 text-xl font-bold">{value}</div>
    </div>
  );
}

interface EmptyStateProps {
  title: string;
  description: string;
  actionLabel: string;
}

function EmptyState({ title, description, actionLabel }: EmptyStateProps) {
  return (
    <div className={styles.emptyNotice}>
      <p className="text-sm font-medium">{title}</p>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{description}</p>
      <Button asChild variant="outline" className="mt-4 bg-black/20">
        <Link to="/modes">
          <Crosshair className="h-4 w-4" />
          {actionLabel}
        </Link>
      </Button>
    </div>
  );
}
