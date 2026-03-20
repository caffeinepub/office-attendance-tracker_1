import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Slider } from "@/components/ui/slider";
import { Check } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useCustomTheme } from "../hooks/useCustomTheme";

const PRESET_COLORS = [
  { name: "Blue", hue: 255, chroma: 0.28 },
  { name: "Purple", hue: 290, chroma: 0.28 },
  { name: "Pink", hue: 315, chroma: 0.28 },
  { name: "Rose", hue: 350, chroma: 0.28 },
  { name: "Orange", hue: 40, chroma: 0.28 },
  { name: "Amber", hue: 55, chroma: 0.28 },
  { name: "Yellow", hue: 85, chroma: 0.26 },
  { name: "Green", hue: 145, chroma: 0.28 },
  { name: "Teal", hue: 185, chroma: 0.28 },
  { name: "Cyan", hue: 210, chroma: 0.28 },
  { name: "Indigo", hue: 270, chroma: 0.28 },
];

const FONT_OPTIONS = [
  "Plus Jakarta Sans",
  "Inter",
  "Roboto",
  "Poppins",
  "Nunito",
  "DM Sans",
  "Outfit",
  "Raleway",
  "Montserrat",
  "Lato",
  "Bricolage Grotesque",
];

interface ThemeCustomizerProps {
  open: boolean;
  onClose: () => void;
}

function oklchStr(l: number, c: number, h: number) {
  return `oklch(${l} ${c} ${h})`;
}

export default function ThemeCustomizer({
  open,
  onClose,
}: ThemeCustomizerProps) {
  const { customTheme, setAccentColor, setFont, resetToDefault } =
    useCustomTheme();

  const [localHue, setLocalHue] = useState(customTheme.primaryHue);
  const [localChroma, setLocalChroma] = useState(customTheme.chroma);
  const [localFont, setLocalFont] = useState(customTheme.fontFamily);
  const applyTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync local state when sheet opens
  useEffect(() => {
    if (open) {
      setLocalHue(customTheme.primaryHue);
      setLocalChroma(customTheme.chroma);
      setLocalFont(customTheme.fontFamily);
    }
  }, [open, customTheme]);

  const applyColor = useCallback(
    (hue: number, chroma: number) => {
      if (applyTimeout.current) clearTimeout(applyTimeout.current);
      applyTimeout.current = setTimeout(() => {
        setAccentColor(hue, chroma);
      }, 30);
    },
    [setAccentColor],
  );

  const handlePreset = (hue: number, chroma: number) => {
    setLocalHue(hue);
    setLocalChroma(chroma);
    applyColor(hue, chroma);
  };

  const handleHueChange = (val: number[]) => {
    const h = val[0];
    setLocalHue(h);
    applyColor(h, localChroma);
  };

  const handleChromaChange = (val: number[]) => {
    const c = val[0];
    setLocalChroma(c);
    applyColor(localHue, c);
  };

  const handleFontSelect = (font: string) => {
    setLocalFont(font);
    setFont(font);
  };

  const handleReset = () => {
    resetToDefault();
    setLocalHue(255);
    setLocalChroma(0.28);
    setLocalFont("Plus Jakarta Sans");
  };

  const isDarkMode = document.documentElement.classList.contains("dark");
  const previewL = isDarkMode ? 0.68 : 0.55;
  const previewColor = oklchStr(previewL, localChroma, localHue);

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent
        side="bottom"
        className="rounded-t-3xl max-h-[92vh] overflow-y-auto pb-safe p-0"
      >
        <SheetHeader className="px-6 pt-6 pb-4 border-b border-border/50">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-lg font-bold">
              Customize Theme
            </SheetTitle>
            <Button
              variant="ghost"
              size="sm"
              data-ocid="theme.reset_button"
              onClick={handleReset}
              className="text-muted-foreground hover:text-foreground text-xs h-8"
            >
              Reset to Default
            </Button>
          </div>
        </SheetHeader>

        <div className="px-6 pt-5 pb-8 space-y-8">
          {/* Color Section */}
          <section>
            <h3 className="text-sm font-semibold text-foreground mb-1">
              Accent Color
            </h3>
            <p className="text-xs text-muted-foreground mb-4">
              Pick a color that reflects your style
            </p>

            {/* Live preview strip */}
            <div
              className="w-full h-10 rounded-2xl mb-5 shadow-sm"
              style={{
                background: `linear-gradient(135deg, ${oklchStr(previewL - 0.05, localChroma, localHue)}, ${oklchStr(previewL + 0.05, Math.min(localChroma + 0.04, 0.38), (localHue + 20) % 360)})`,
              }}
            />

            {/* Preset swatches */}
            <div className="flex flex-wrap gap-3 mb-6">
              {PRESET_COLORS.map((preset, idx) => {
                const isSelected =
                  Math.abs(localHue - preset.hue) < 5 &&
                  Math.abs(localChroma - preset.chroma) < 0.02;
                const swatchColor = oklchStr(
                  previewL,
                  preset.chroma,
                  preset.hue,
                );
                return (
                  <button
                    type="button"
                    key={preset.name}
                    data-ocid={`theme.color_swatch.${idx + 1}`}
                    onClick={() => handlePreset(preset.hue, preset.chroma)}
                    title={preset.name}
                    className="relative w-11 h-11 rounded-full transition-all duration-200 hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    style={{ backgroundColor: swatchColor }}
                  >
                    {isSelected && (
                      <span className="absolute inset-0 flex items-center justify-center">
                        <Check className="w-4 h-4 text-white drop-shadow" />
                      </span>
                    )}
                    {!isSelected && (
                      <span className="absolute inset-0 rounded-full ring-2 ring-transparent hover:ring-white/40 transition-all" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Hue slider */}
            <div className="space-y-2 mb-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">
                  Hue
                </span>
                <span className="text-xs font-mono text-foreground bg-secondary px-2 py-0.5 rounded-md">
                  {Math.round(localHue)}°
                </span>
              </div>
              <div className="relative">
                {/* Rainbow gradient behind slider track */}
                <div
                  className="absolute inset-y-0 left-0 right-0 h-2 top-1/2 -translate-y-1/2 rounded-full pointer-events-none"
                  style={{
                    background:
                      "linear-gradient(to right, oklch(0.6 0.28 0), oklch(0.6 0.28 30), oklch(0.6 0.28 60), oklch(0.6 0.28 90), oklch(0.6 0.28 120), oklch(0.6 0.28 150), oklch(0.6 0.28 180), oklch(0.6 0.28 210), oklch(0.6 0.28 240), oklch(0.6 0.28 270), oklch(0.6 0.28 300), oklch(0.6 0.28 330), oklch(0.6 0.28 360))",
                  }}
                />
                <Slider
                  data-ocid="theme.hue_slider"
                  min={0}
                  max={360}
                  step={1}
                  value={[localHue]}
                  onValueChange={handleHueChange}
                  className="[&_[role=slider]]:bg-white [&_[role=slider]]:border-2 [&_[role=slider]]:border-white/80 [&_[role=slider]]:shadow-md [&_.bg-primary]:bg-transparent [&_[data-orientation=horizontal]>.bg-primary]:bg-transparent"
                />
              </div>
            </div>

            {/* Chroma / Vibrancy slider */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">
                  Vibrancy
                </span>
                <span className="text-xs font-mono text-foreground bg-secondary px-2 py-0.5 rounded-md">
                  {Math.round(localChroma * 100)}%
                </span>
              </div>
              <div className="relative">
                <div
                  className="absolute inset-y-0 left-0 right-0 h-2 top-1/2 -translate-y-1/2 rounded-full pointer-events-none"
                  style={{
                    background: `linear-gradient(to right, oklch(${previewL} 0.05 ${localHue}), oklch(${previewL} 0.38 ${localHue}))`,
                  }}
                />
                <Slider
                  data-ocid="theme.chroma_slider"
                  min={0.05}
                  max={0.35}
                  step={0.01}
                  value={[localChroma]}
                  onValueChange={handleChromaChange}
                  className="[&_[role=slider]]:bg-white [&_[role=slider]]:border-2 [&_[role=slider]]:border-white/80 [&_[role=slider]]:shadow-md [&_.bg-primary]:bg-transparent"
                />
              </div>
            </div>
          </section>

          {/* Font Section */}
          <section>
            <h3 className="text-sm font-semibold text-foreground mb-1">
              Font Family
            </h3>
            <p className="text-xs text-muted-foreground mb-4">
              Choose how the text feels
            </p>

            <div className="grid grid-cols-2 gap-3">
              {FONT_OPTIONS.map((font, idx) => {
                const isActive = localFont === font;
                return (
                  <button
                    type="button"
                    key={font}
                    data-ocid={`theme.font_card.${idx + 1}`}
                    onClick={() => handleFontSelect(font)}
                    className={`relative flex flex-col items-center justify-center gap-1.5 p-4 rounded-2xl border-2 transition-all duration-200 ${
                      isActive
                        ? "border-primary bg-primary/5 shadow-sm"
                        : "border-border bg-card hover:border-border/80 hover:bg-secondary/50"
                    }`}
                  >
                    {isActive && (
                      <span
                        className="absolute top-2 right-2 w-4 h-4 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: previewColor }}
                      >
                        <Check className="w-2.5 h-2.5 text-white" />
                      </span>
                    )}
                    <span
                      className="text-3xl font-medium text-foreground leading-none"
                      style={{ fontFamily: `"${font}", system-ui, sans-serif` }}
                    >
                      Aa
                    </span>
                    <span className="text-[10px] text-center text-muted-foreground leading-tight font-sans">
                      {font}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Done button */}
          <Button
            data-ocid="theme.close_button"
            onClick={onClose}
            className="w-full h-12 rounded-2xl text-sm font-semibold"
            style={{ backgroundColor: previewColor }}
          >
            Done
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
