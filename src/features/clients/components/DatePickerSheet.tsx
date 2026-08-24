import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { BottomSheet, SheetFooter } from '@/components/ui/BottomSheet';
import { calculateAge } from '@/lib/format';
import { s } from '@/theme/scale';
import { colors, radius } from '@/theme/tokens';
import { fonts, fontSizes } from '@/theme/typography';

const MONTH_NAMES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];

const DAYS_OF_WEEK = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

type Props = {
  visible: boolean;
  initialDateIso?: string | null;
  onClose: () => void;
  onSelectDate: (isoDate: string | null) => void;
};

export function DatePickerSheet({
  visible,
  initialDateIso,
  onClose,
  onSelectDate,
}: Props) {
  const currentYear = new Date().getFullYear();

  // Parse initial date or default to 25 years ago
  const parsed = initialDateIso ? initialDateIso.split('-').map(Number) : null;
  const initialYear = parsed && parsed.length === 3 ? parsed[0] : currentYear - 25;
  const initialMonth = parsed && parsed.length === 3 ? parsed[1] - 1 : 0;
  const initialDay = parsed && parsed.length === 3 ? parsed[2] : 15;

  const [viewYear, setViewYear] = useState<number>(initialYear);
  const [viewMonth, setViewMonth] = useState<number>(initialMonth);
  const [selectedYear, setSelectedYear] = useState<number | null>(parsed ? initialYear : null);
  const [selectedMonth, setSelectedMonth] = useState<number | null>(parsed ? initialMonth : null);
  const [selectedDay, setSelectedDay] = useState<number | null>(parsed ? initialDay : null);
  const [isSelectingYear, setIsSelectingYear] = useState<boolean>(false);

  // Lista de años disponibles (desde 1930 hasta el año actual)
  const yearsList = Array.from({ length: currentYear - 1930 + 1 }, (_, i) => currentYear - i);

  function prevMonth() {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  }

  function nextMonth() {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  }

  // Días del mes
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  // Primer día de la semana (0 = domingo -> convertir a 0 = lunes)
  const firstDayIndex = (new Date(viewYear, viewMonth, 1).getDay() + 6) % 7;

  const selectedIso =
    selectedYear != null && selectedMonth != null && selectedDay != null
      ? `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${String(selectedDay).padStart(2, '0')}`
      : null;

  const age = calculateAge(selectedIso);

  function handleSelectDay(day: number) {
    setSelectedYear(viewYear);
    setSelectedMonth(viewMonth);
    setSelectedDay(day);
  }

  function handleConfirm() {
    onSelectDate(selectedIso);
    onClose();
  }

  function handleClear() {
    onSelectDate(null);
    onClose();
  }

  return (
    <BottomSheet visible={visible} onClose={onClose} title="Fecha de nacimiento">
      {/* Selector de Mes y Año */}
      <View style={styles.headerRow}>
        <Pressable
          hitSlop={8}
          onPress={prevMonth}
          style={styles.navArrow}
          accessibilityLabel="Mes anterior"
        >
          <ChevronLeft size={s(18)} color={colors.navy} />
        </Pressable>

        <View style={styles.headerControls}>
          <Text style={styles.monthTitle}>{MONTH_NAMES[viewMonth]}</Text>
          <Pressable
            onPress={() => setIsSelectingYear((v) => !v)}
            style={[styles.yearButton, isSelectingYear && styles.yearButtonActive]}
          >
            <Text style={[styles.yearButtonText, isSelectingYear && styles.yearButtonTextActive]}>
              {viewYear} ▾
            </Text>
          </Pressable>
        </View>

        <Pressable
          hitSlop={8}
          onPress={nextMonth}
          style={styles.navArrow}
          accessibilityLabel="Mes siguiente"
        >
          <ChevronRight size={s(18)} color={colors.navy} />
        </Pressable>
      </View>

      {/* Selector rápido de año desplegable */}
      {isSelectingYear ? (
        <View style={styles.yearsContainer}>
          <Text style={styles.yearsHint}>Selecciona el año de nacimiento:</Text>
          <ScrollView
            style={styles.yearsScroll}
            contentContainerStyle={styles.yearsGrid}
            showsVerticalScrollIndicator={true}
          >
            {yearsList.map((y) => {
              const isCurrent = y === viewYear;
              return (
                <Pressable
                  key={y}
                  onPress={() => {
                    setViewYear(y);
                    setIsSelectingYear(false);
                  }}
                  style={[styles.yearCell, isCurrent && styles.yearCellSelected]}
                >
                  <Text style={[styles.yearCellText, isCurrent && styles.yearCellTextSelected]}>
                    {y}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      ) : (
        /* Calendario mensual */
        <View style={styles.calendarContainer}>
          {/* Días de la semana */}
          <View style={styles.weekDaysRow}>
            {DAYS_OF_WEEK.map((d, index) => (
              <Text key={index} style={styles.weekDayText}>
                {d}
              </Text>
            ))}
          </View>

          {/* Días del mes */}
          <View style={styles.daysGrid}>
            {/* Espacios vacíos antes del primer día */}
            {Array.from({ length: firstDayIndex }).map((_, i) => (
              <View key={`empty-${i}`} style={styles.dayCellEmpty} />
            ))}

            {/* Días del mes */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const isSelected =
                selectedYear === viewYear &&
                selectedMonth === viewMonth &&
                selectedDay === day;

              return (
                <Pressable
                  key={`day-${day}`}
                  onPress={() => handleSelectDay(day)}
                  style={[styles.dayCell, isSelected && styles.dayCellSelected]}
                >
                  <Text
                    style={[styles.dayCellText, isSelected && styles.dayCellTextSelected]}
                  >
                    {day}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      )}

      {/* Resumen de fecha seleccionada y edad calculada */}
      <View style={styles.summaryBox}>
        <Text style={styles.summaryLabel}>Fecha seleccionada:</Text>
        <Text style={styles.summaryValue}>
          {selectedIso
            ? `${selectedDay} de ${MONTH_NAMES[selectedMonth!].toLowerCase()} de ${selectedYear} (${age ?? '—'} años)`
            : 'Sin fecha seleccionada'}
        </Text>
      </View>

      {/* Footer de acciones */}
      <View style={styles.footerRow}>
        <Pressable onPress={handleClear} style={styles.clearButton}>
          <Text style={styles.clearButtonText}>Borrar fecha</Text>
        </Pressable>
        <View style={styles.mainActions}>
          <SheetFooter
            onCancel={onClose}
            onConfirm={handleConfirm}
            confirmLabel="Guardar fecha"
            confirmDisabled={!selectedIso}
          />
        </View>
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: s(4),
  },
  headerControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(8),
  },
  monthTitle: {
    fontFamily: fonts.headingSemi,
    fontSize: fontSizes.sm,
    color: colors.navy,
  },
  yearButton: {
    backgroundColor: colors.background,
    paddingVertical: s(4),
    paddingHorizontal: s(8),
    borderRadius: radius.chip,
    borderWidth: 1,
    borderColor: colors.border,
  },
  yearButtonActive: {
    backgroundColor: colors.navy,
    borderColor: colors.navy,
  },
  yearButtonText: {
    fontFamily: fonts.bodyBold,
    fontSize: fontSizes.xs,
    color: colors.navy,
  },
  yearButtonTextActive: {
    color: colors.surface,
  },
  navArrow: {
    padding: s(6),
    borderRadius: radius.input,
    backgroundColor: colors.background,
  },
  yearsContainer: {
    height: s(180),
    gap: s(6),
  },
  yearsHint: {
    fontFamily: fonts.body,
    fontSize: fontSizes.label,
    color: colors.textSecondary,
  },
  yearsScroll: {
    flex: 1,
  },
  yearsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: s(6),
    paddingVertical: s(4),
  },
  yearCell: {
    width: '23%',
    paddingVertical: s(8),
    alignItems: 'center',
    borderRadius: radius.input,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  yearCellSelected: {
    backgroundColor: colors.navy,
    borderColor: colors.navy,
  },
  yearCellText: {
    fontFamily: fonts.bodyBold,
    fontSize: fontSizes.xs,
    color: colors.text,
  },
  yearCellTextSelected: {
    color: colors.surface,
  },
  calendarContainer: {
    gap: s(6),
  },
  weekDaysRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: s(4),
  },
  weekDayText: {
    width: s(28),
    textAlign: 'center',
    fontFamily: fonts.headingSemi,
    fontSize: fontSizes.label,
    color: colors.textSecondary,
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCellEmpty: {
    width: '14.28%',
    height: s(28),
  },
  dayCell: {
    width: '14.28%',
    height: s(28),
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.input,
    marginVertical: s(1),
  },
  dayCellSelected: {
    backgroundColor: colors.navy,
  },
  dayCellText: {
    fontFamily: fonts.body,
    fontSize: fontSizes.xs,
    color: colors.text,
  },
  dayCellTextSelected: {
    fontFamily: fonts.bodyBold,
    color: colors.surface,
  },
  summaryBox: {
    backgroundColor: colors.background,
    borderRadius: radius.input,
    padding: s(8),
    marginTop: s(4),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  summaryLabel: {
    fontFamily: fonts.body,
    fontSize: fontSizes.label,
    color: colors.textSecondary,
  },
  summaryValue: {
    fontFamily: fonts.bodyBold,
    fontSize: fontSizes.label,
    color: colors.navy,
  },
  footerRow: {
    marginTop: s(6),
    gap: s(6),
  },
  clearButton: {
    alignSelf: 'center',
    paddingVertical: s(4),
    paddingHorizontal: s(8),
  },
  clearButtonText: {
    fontFamily: fonts.body,
    fontSize: fontSizes.label,
    color: colors.danger,
  },
  mainActions: {
    width: '100%',
  },
});
