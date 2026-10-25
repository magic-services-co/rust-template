"use client";

import * as React from "react";
import { Label } from "@/components/ui/label";
import { TimePickerInput } from "./ui/time-picker-input";
import { TimePeriodSelect } from "./ui/time-picker-select";
import { Period } from "./ui/time-picker-utils";

export function keepTimeOnDaySelect(current: Date | undefined, day: Date | undefined): Date | undefined {
    if (!day) return current
    const next = new Date(current ?? day)
    next.setFullYear(day.getFullYear(), day.getMonth(), day.getDate())
    return next
}

interface TimePickerDemoProps {
    date: Date | undefined;
    setDate: (date: Date | undefined) => void;
}

export function TimePicker({ date, setDate }: TimePickerDemoProps) {
    const [period, setPeriod] = React.useState<Period>(() => {
        if (!date) return "AM";
        return date.getHours() >= 12 ? "PM" : "AM";
    });

    const minuteRef = React.useRef<HTMLInputElement>(null);
    const hourRef = React.useRef<HTMLInputElement>(null);
    const secondRef = React.useRef<HTMLInputElement>(null);
    const periodRef = React.useRef<HTMLButtonElement>(null);

    const handleTimeChange = (newDate: Date | undefined) => {
        if (!date || !newDate) return;
        const updatedDate = new Date(date);
        updatedDate.setHours(newDate.getHours());
        updatedDate.setMinutes(newDate.getMinutes());
        updatedDate.setSeconds(newDate.getSeconds());
        setDate(updatedDate);
    };

    React.useEffect(() => {
        if (date) {
            setPeriod(date.getHours() >= 12 ? "PM" : "AM");
        }
    }, [date]);

    return (
        <div className="flex items-end gap-2">
            <div className="grid gap-1 text-center">
                <Label htmlFor="hours" className="text-xs">
                    Hours
                </Label>
                <TimePickerInput
                    picker="12hours"
                    period={period}
                    date={date}
                    setDate={handleTimeChange}
                    ref={hourRef}
                    onRightFocus={() => {
                        minuteRef.current?.focus();
                    }}
                />
            </div>
            <div className="grid gap-1 text-center">
                <Label htmlFor="minutes" className="text-xs">
                    Minutes
                </Label>
                <TimePickerInput
                    picker="minutes"
                    id="minutes12"
                    date={date}
                    setDate={handleTimeChange}
                    ref={minuteRef}
                    onLeftFocus={() => {
                        hourRef.current?.focus();
                    }}
                    onRightFocus={() => {
                        secondRef.current?.focus();
                    }}
                />
            </div>
            <div className="grid gap-1 text-center">
                <Label htmlFor="seconds" className="text-xs">
                    Seconds
                </Label>
                <TimePickerInput
                    picker="seconds"
                    id="seconds12"
                    date={date}
                    setDate={handleTimeChange}
                    ref={secondRef}
                    onLeftFocus={() => {
                        minuteRef.current?.focus();
                    }}
                    onRightFocus={() => {
                        periodRef.current?.focus();
                    }}
                />
            </div>
            <div className="grid gap-1 text-center">
                <Label htmlFor="period" className="text-xs">
                    Period
                </Label>
                <TimePeriodSelect
                    period={period}
                    setPeriod={setPeriod}
                    date={date}
                    setDate={handleTimeChange}
                    ref={periodRef}
                    onLeftFocus={() => {
                        secondRef.current?.focus();
                    }}
                />
            </div>
        </div>
    );
}