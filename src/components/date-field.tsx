import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import {
  Button,
  Dialog,
  IconButton,
  Portal,
  Text,
  TextInput,
} from "react-native-paper";

import { useTheme } from "@/hooks/use-theme";

type Props = {
  label?: string;
  value: string; // the date as YYYY-MM-DD
  onChange: (value: string) => void;
};

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];

function toDateString(d: Date) {
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${month}-${day}`;
}

function parseDate(value: string): Date {
  const parts = value.split("-").map(Number);
  const d = new Date(parts[0], (parts[1] || 1) - 1, parts[2] || 1);
  if (parts.length !== 3 || isNaN(d.getTime())) return new Date();
  return d;
}

export default function DateField({ label = "Date", value, onChange }: Props) {
  const colors = useTheme();
  const [open, setOpen] = useState(false);

  const selected = parseDate(value);
  const [viewMonth, setViewMonth] = useState(
    new Date(selected.getFullYear(), selected.getMonth(), 1),
  );

  function openPicker() {
    // Show the month of the currently chosen date
    setViewMonth(new Date(selected.getFullYear(), selected.getMonth(), 1));
    setOpen(true);
  }

  function shiftMonth(amount: number) {
    setViewMonth(
      new Date(viewMonth.getFullYear(), viewMonth.getMonth() + amount, 1),
    );
  }

  function pickDay(day: number) {
    onChange(
      toDateString(
        new Date(viewMonth.getFullYear(), viewMonth.getMonth(), day),
      ),
    );
    setOpen(false);
  }

  function pickToday() {
    onChange(toDateString(new Date()));
    setOpen(false);
  }

  // Build the calendar grid
  const year = viewMonth.getFullYear();
  const month = viewMonth.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startOffset = new Date(year, month, 1).getDay(); // 0 = Sunday

  const cells: (number | null)[] = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const rows: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));

  const today = new Date();
  const monthTitle = viewMonth.toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  });
  const displayText = selected.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <View style={styles.wrapper}>
      <Pressable onPress={openPicker}>
        <View style={{ pointerEvents: "none" }}>
          <TextInput
            label={label}
            mode="outlined"
            value={displayText}
            editable={false}
            right={<TextInput.Icon icon="calendar" />}
          />
        </View>
      </Pressable>

      <Portal>
        <Dialog
          visible={open}
          onDismiss={() => setOpen(false)}
          style={{ backgroundColor: colors.card }}
        >
          <Dialog.Content>
            {/* Month selector */}
            <View style={styles.monthRow}>
              <IconButton
                icon="chevron-left"
                iconColor={colors.text}
                onPress={() => shiftMonth(-1)}
              />
              <Text
                variant="titleMedium"
                style={{ color: colors.text, fontWeight: "700" }}
              >
                {monthTitle}
              </Text>
              <IconButton
                icon="chevron-right"
                iconColor={colors.text}
                onPress={() => shiftMonth(1)}
              />
            </View>

            {/* Weekday letters */}
            <View style={styles.weekRow}>
              {WEEKDAYS.map((w, i) => (
                <View key={i} style={styles.cell}>
                  <Text style={{ color: colors.secondary, fontSize: 12 }}>
                    {w}
                  </Text>
                </View>
              ))}
            </View>

            {/* Days */}
            {rows.map((row, r) => (
              <View key={r} style={styles.weekRow}>
                {row.map((day, c) => {
                  if (day === null) {
                    return <View key={c} style={styles.cell} />;
                  }
                  const isSelected =
                    day === selected.getDate() &&
                    month === selected.getMonth() &&
                    year === selected.getFullYear();
                  const isToday =
                    day === today.getDate() &&
                    month === today.getMonth() &&
                    year === today.getFullYear();
                  return (
                    <View key={c} style={styles.cell}>
                      <Pressable
                        onPress={() => pickDay(day)}
                        style={[
                          styles.day,
                          isSelected && { backgroundColor: colors.primary },
                          !isSelected &&
                            isToday && {
                              borderWidth: 1,
                              borderColor: colors.primary,
                            },
                        ]}
                      >
                        <Text
                          style={{
                            color: isSelected ? "#0B1220" : colors.text,
                            fontWeight: isSelected || isToday ? "700" : "400",
                          }}
                        >
                          {day}
                        </Text>
                      </Pressable>
                    </View>
                  );
                })}
              </View>
            ))}
          </Dialog.Content>
          <Dialog.Actions>
            <Button textColor={colors.primary} onPress={pickToday}>
              Today
            </Button>
            <Button textColor={colors.secondary} onPress={() => setOpen(false)}>
              Cancel
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginBottom: 12 },
  monthRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  weekRow: { flexDirection: "row" },
  cell: {
    flex: 1,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  day: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
});
