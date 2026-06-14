import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { TransactionsStackScreenProps } from '../../core/navigation/types';
import { useTransactionsStore } from './transactionsStore';
import { EmptyState, Fab, Icon } from '../../core/ui';
import { colors, fontFamily, fontSize, spacing } from '../../core/theme';
import TransactionList from './components/TransactionList';
import { PRESET_LABEL, filterByPreset, useDateRangeStore } from './dateRangeStore';

/**
 * TransactionList 畫面 —— 交易 tab 落地頁（時間軸版型 B；transactions-page-spec）。
 *
 * - 標題「交易紀錄」+ 右側日曆鈕（開期間篩選 sheet，T5）。
 * - 「期間：◯◯」pill（點擊同樣開 sheet）。
 * - 時間軸清單（按月分組 + 買/賣膠囊 + 金額 + 已實現）。
 * - 新增交易入口 = FAB only（T4；header 無 ＋）。row 點擊 → TransactionDetail。
 * - 篩選後無結果 → EmptyState（含「重設篩選」）。
 */
export default function TransactionsScreen({
  navigation,
}: TransactionsStackScreenProps<'TransactionList'>) {
  const transactions = useTransactionsStore((s) => s.transactions);
  const preset = useDateRangeStore((s) => s.preset);
  const reset = useDateRangeStore((s) => s.reset);

  const filtered = useMemo(() => filterByPreset(transactions, preset), [transactions, preset]);

  const hasAny = transactions.length > 0;
  const hasFiltered = filtered.length > 0;

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.title}>交易紀錄</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="日期區間"
          onPress={() => navigation.navigate('DateRange')}
          style={({ pressed }) => [styles.calBtn, pressed ? styles.pressed : null]}
        >
          <Icon name="calendar" size={20} color={colors.textSecondary} />
        </Pressable>
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="期間篩選"
        onPress={() => navigation.navigate('DateRange')}
        style={({ pressed }) => [styles.rangePill, pressed ? styles.pressed : null]}
      >
        <Text style={styles.rangePillText}>期間：{PRESET_LABEL[preset]}</Text>
        <Text style={styles.caret}>▾</Text>
      </Pressable>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {!hasAny ? (
          <EmptyState
            icon={<Icon name="txn" size={26} color={colors.accent} />}
            title="尚無交易"
            subtitle="點右下角 ＋ 記錄第一筆買入"
          />
        ) : !hasFiltered ? (
          <EmptyState
            icon={<Icon name="txn" size={26} color={colors.accent} />}
            title="沒有符合的交易"
            subtitle="調整日期區間試試"
            actionLabel="重設篩選"
            onAction={reset}
          />
        ) : (
          <TransactionList
            transactions={filtered}
            onRowPress={(transactionId) =>
              navigation.navigate('TransactionDetail', { transactionId })
            }
          />
        )}
      </ScrollView>

      <Fab
        onPress={() => navigation.navigate('AddTransaction')}
        accessibilityLabel="新增交易"
        icon={<Icon name="plus" color={colors.onPrimary} size={24} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.screen },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.page,
    paddingTop: spacing.xs,
    paddingBottom: spacing.sm,
  },
  title: {
    flex: 1,
    fontFamily: fontFamily.text.extrabold,
    fontSize: fontSize.cardTitle,
    color: colors.textPrimary,
    letterSpacing: -0.2,
  },
  calBtn: {
    width: 38,
    height: 38,
    borderRadius: 38,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.divider,
  },
  pressed: { opacity: 0.6 },
  rangePill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
    marginHorizontal: spacing.page,
    marginBottom: spacing.xs,
    paddingVertical: 5,
    paddingHorizontal: spacing.md,
    borderRadius: 100,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.divider,
  },
  rangePillText: {
    fontFamily: fontFamily.text.semibold,
    fontSize: 11.5,
    color: colors.textSecondary,
  },
  caret: { color: colors.textWeak, fontSize: 9 },
  content: {
    flexGrow: 1,
    paddingHorizontal: spacing.page,
    paddingBottom: 96,
  },
});
