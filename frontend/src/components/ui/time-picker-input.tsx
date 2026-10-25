"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { ChevronUp, ChevronDown } from "lucide-react";
import {
    Period,
    TimePickerType,
} from "./time-picker-utils";

export interface TimePickerInputProps
    extends React.InputHTMLAttributes<HTMLInputElement> {
    picker: TimePickerType;
    date: Date | undefined;
    setDate: (date: Date | undefined) => void;
    period?: Period;
    onRightFocus?: () => void;
    onLeftFocus?: () => void;
}

const TimePickerInput = React.forwardRef<HTMLInputElement, TimePickerInputProps>(
    ({ className, picker, date, setDate, period, onRightFocus, onLeftFocus, ...props }, ref) => {
        const [inputValue, setInputValue] = React.useState<string>("");
        const inputRef = React.useRef<HTMLInputElement>(null);

        React.useEffect(() => {
            if (!date) {
                setInputValue("");
                return;
            }

            if (picker === "hours" || picker === "12hours") {
                let hours = date.getHours();
                if (picker === "12hours") {
                    hours = hours % 12 || 12;
                }
                setInputValue(hours.toString().padStart(2, "0"));
            } else if (picker === "minutes") {
                setInputValue(date.getMinutes().toString().padStart(2, "0"));
            } else if (picker === "seconds") {
                setInputValue(date.getSeconds().toString().padStart(2, "0"));
            }
        }, [date, picker, period]);

        const updateTime = (newValue: number) => {
            if (!date) return;

            const newDate = new Date(date);
            if (picker === "hours" || picker === "12hours") {
                let hours = newValue;
                if (picker === "12hours") {
                    if (period === "PM") {
                        hours = hours === 12 ? 12 : hours + 12;
                    } else {
                        hours = hours === 12 ? 0 : hours;
                    }
                }
                newDate.setHours(hours);
            } else if (picker === "minutes") {
                newDate.setMinutes(newValue);
            } else if (picker === "seconds") {
                newDate.setSeconds(newValue);
            }
            setDate(newDate);
        };

        const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
            const value = e.target.value.replace(/[^0-9]/g, "");
            if (value.length <= 2) {
                setInputValue(value);
                if (value.length === 2) {
                    const numValue = parseInt(value);
                    if (picker === "hours" || picker === "12hours") {
                        if (numValue >= 1 && numValue <= 12) {
                            updateTime(numValue);
                            onRightFocus?.();
                        }
                    } else if (picker === "minutes" || picker === "seconds") {
                        if (numValue >= 0 && numValue <= 59) {
                            updateTime(numValue);
                            onRightFocus?.();
                        }
                    }
                }
            }
        };

        const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
            if (e.key === "ArrowRight") {
                e.preventDefault();
                onRightFocus?.();
            } else if (e.key === "ArrowLeft") {
                e.preventDefault();
                onLeftFocus?.();
            } else if (e.key === "ArrowUp") {
                e.preventDefault();
                incrementValue();
            } else if (e.key === "ArrowDown") {
                e.preventDefault();
                decrementValue();
            }
        };

        const incrementValue = () => {
            if (!date) return;

            let currentValue = 0;
            if (picker === "hours" || picker === "12hours") {
                currentValue = date.getHours();
                if (picker === "12hours") {
                    currentValue = currentValue % 12 || 12;
                }
                currentValue = (currentValue % (picker === "12hours" ? 12 : 24)) + 1;
            } else if (picker === "minutes") {
                currentValue = (date.getMinutes() + 1) % 60;
            } else if (picker === "seconds") {
                currentValue = (date.getSeconds() + 1) % 60;
            }
            updateTime(currentValue);
        };

        const decrementValue = () => {
            if (!date) return;

            let currentValue = 0;
            if (picker === "hours" || picker === "12hours") {
                currentValue = date.getHours();
                if (picker === "12hours") {
                    currentValue = currentValue % 12 || 12;
                }
                currentValue = (currentValue - 1 + (picker === "12hours" ? 12 : 24)) % (picker === "12hours" ? 12 : 24);
                if (picker === "12hours" && currentValue === 0) currentValue = 12;
            } else if (picker === "minutes") {
                currentValue = (date.getMinutes() - 1 + 60) % 60;
            } else if (picker === "seconds") {
                currentValue = (date.getSeconds() - 1 + 60) % 60;
            }
            updateTime(currentValue);
        };

        return (
            <div className="flex flex-col items-center gap-1">
                <button
                    type="button"
                    className={cn(
                        buttonVariants({ variant: "outline" }),
                        "h-7 w-7 rounded-md p-0"
                    )}
                    onClick={incrementValue}
                >
                    <ChevronUp className="h-4 w-4" />
                </button>
                <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={2}
                    ref={inputRef}
                    value={inputValue}
                    onChange={handleChange}
                    onBlur={() => {
                        if (inputValue === "") return
                        const numValue = parseInt(inputValue, 10)
                        if (Number.isNaN(numValue)) return
                        if (picker === "hours" || picker === "12hours") {
                            const min = picker === "12hours" ? 1 : 0
                            const max = picker === "12hours" ? 12 : 23
                            if (numValue >= min && numValue <= max) updateTime(numValue)
                        } else if (numValue >= 0 && numValue <= 59) {
                            updateTime(numValue)
                        }
                    }}
                    onKeyDown={handleKeyDown}
                    className={cn(
                        "w-8 rounded-md border border-input bg-background px-1 py-1 text-center text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                        className
                    )}
                    {...props}
                />
                <button
                    type="button"
                    className={cn(
                        buttonVariants({ variant: "outline" }),
                        "h-7 w-7 rounded-md p-0"
                    )}
                    onClick={decrementValue}
                >
                    <ChevronDown className="h-4 w-4" />
                </button>
            </div>
        );
    }
);

TimePickerInput.displayName = "TimePickerInput";

export { TimePickerInput };