import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Share,
  Alert,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as logger from '../../services/logger';
import { PRIMARY, DARK, BG, BORDER } from '../../constants/colors';

/**
 * DEBUG SCREEN — View app logs and error tracking (development only)
 *
 * Access via: console.log('__DEV__:', __DEV__) in App
 * Future: Add a settings screen toggle or deep link to enable this
 */

const LogLevelColors = {
  INFO: '#0066cc',
  DEBUG: '#666666',
  WARN: '#ff9900',
  ERROR: '#cc0000',
};

export default function DebugScreen({ navigation }) {
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState(null);
  const [filter, setFilter] = useState('ALL'); // ALL, INFO, WARN, ERROR
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    refreshLogs();
  }, []);

  const refreshLogs = () => {
    setRefreshing(true);
    const allLogs = logger.getLogs();
    setLogs(allLogs);
    setStats(logger.getStats());
    setRefreshing(false);
  };

  const getFilteredLogs = () => {
    if (filter === 'ALL') return logs;
    return logs.filter((l) => l.level === filter);
  };

  const handleShare = async () => {
    try {
      const logContent = logger.exportLogs();
      await Share.share({
        message: logContent,
        title: 'App Logs Export',
      });
    } catch (err) {
      Alert.alert('Error', 'Failed to share logs');
    }
  };

  const handleClearLogs = () => {
    Alert.alert('Clear Logs?', 'This will permanently delete all stored logs', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          logger.clearLogs();
          refreshLogs();
        },
      },
    ]);
  };

  const filteredLogs = getFilteredLogs();

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Debug Logs</Text>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="close" size={24} color={PRIMARY} />
        </TouchableOpacity>
      </View>

      {/* Stats */}
      {stats && (
        <View style={styles.stats}>
          <StatBox label="Total" value={stats.total} color="#666" />
          <StatBox label="Info" value={stats.byLevel.INFO || 0} color={LogLevelColors.INFO} />
          <StatBox label="Warns" value={stats.byLevel.WARN || 0} color={LogLevelColors.WARN} />
          <StatBox label="Errors" value={stats.byLevel.ERROR || 0} color={LogLevelColors.ERROR} />
        </View>
      )}

      {/* Filter Buttons */}
      <View style={styles.filterBar}>
        {['ALL', 'INFO', 'WARN', 'ERROR'].map((btn) => (
          <TouchableOpacity
            key={btn}
            style={[styles.filterBtn, filter === btn && styles.filterBtnActive]}
            onPress={() => setFilter(btn)}
          >
            <Text
              style={[
                styles.filterBtnText,
                filter === btn && styles.filterBtnTextActive,
              ]}
            >
              {btn}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Action Buttons */}
      <View style={styles.actions}>
        <TouchableOpacity style={styles.actionBtn} onPress={refreshLogs}>
          <Ionicons name="refresh" size={18} color="#fff" />
          <Text style={styles.actionBtnText}>Refresh</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={handleShare}>
          <Ionicons name="share-social" size={18} color="#fff" />
          <Text style={styles.actionBtnText}>Export</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionBtn, styles.actionBtnDanger]} onPress={handleClearLogs}>
          <Ionicons name="trash" size={18} color="#fff" />
          <Text style={styles.actionBtnText}>Clear</Text>
        </TouchableOpacity>
      </View>

      {/* Logs List */}
      <FlatList
        data={filteredLogs}
        keyExtractor={(item, idx) => `${item.timestamp}${idx}`}
        renderItem={({ item }) => <LogEntry log={item} />}
        ListEmptyComponent={<EmptyLogsMessage />}
        contentContainerStyle={styles.logsList}
        onEndReachedThreshold={0.5}
      />
    </View>
  );
}

function LogEntry({ log }) {
  const [expanded, setExpanded] = useState(false);
  const levelColor = LogLevelColors[log.level] || '#666';

  return (
    <TouchableOpacity
      style={styles.logEntry}
      onPress={() => setExpanded(!expanded)}
      activeOpacity={0.7}
    >
      <View style={styles.logHeader}>
        <View style={[styles.levelIndicator, { backgroundColor: levelColor }]} />
        <View style={styles.logTitleContainer}>
          <Text style={styles.logTime}>{log.displayTime}</Text>
          <Text style={styles.logSource}>[{log.source}]</Text>
          <Text style={styles.logMessage} numberOfLines={expanded ? 0 : 1}>
            {log.message}
          </Text>
        </View>
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={18}
          color={BORDER}
        />
      </View>

      {expanded && (
        <View style={styles.logDetails}>
          {log.data && (
            <View style={styles.detailSection}>
              <Text style={styles.detailLabel}>Data:</Text>
              <Text style={styles.detailValue}>{JSON.stringify(log.data, null, 2)}</Text>
            </View>
          )}
          {log.errorType && (
            <View style={styles.detailSection}>
              <Text style={styles.detailLabel}>Error Type:</Text>
              <Text style={[styles.detailValue, { color: LogLevelColors.ERROR }]}>
                {log.errorType}
              </Text>
            </View>
          )}
          {log.errorMessage && (
            <View style={styles.detailSection}>
              <Text style={styles.detailLabel}>Error Message:</Text>
              <Text style={styles.detailValue}>{log.errorMessage}</Text>
            </View>
          )}
          {log.errorStack && (
            <View style={styles.detailSection}>
              <Text style={styles.detailLabel}>Stack:</Text>
              <Text style={[styles.detailValue, { fontSize: 11 }]}>{log.errorStack}</Text>
            </View>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
}

function StatBox({ label, value, color }) {
  return (
    <View style={styles.statBox}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
    </View>
  );
}

function EmptyLogsMessage() {
  return (
    <View style={styles.emptyContainer}>
      <Ionicons name="document-text-outline" size={48} color={BORDER} />
      <Text style={styles.emptyText}>No logs yet</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    paddingTop: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: DARK,
  },
  stats: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: BORDER,
  },
  statLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  filterBar: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
  },
  filterBtn: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: BORDER,
    alignItems: 'center',
  },
  filterBtnActive: {
    backgroundColor: PRIMARY,
    borderColor: PRIMARY,
  },
  filterBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  filterBtnTextActive: {
    color: '#fff',
  },
  actions: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: PRIMARY,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  actionBtnDanger: {
    backgroundColor: '#cc0000',
  },
  actionBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  logsList: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  logEntry: {
    backgroundColor: '#fff',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#999',
    overflow: 'hidden',
  },
  logHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 10,
    gap: 8,
  },
  levelIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginTop: 4,
    flexShrink: 0,
  },
  logTitleContainer: {
    flex: 1,
  },
  logTime: {
    fontSize: 11,
    color: '#999',
    fontWeight: '500',
    marginBottom: 2,
  },
  logSource: {
    fontSize: 12,
    color: PRIMARY,
    fontWeight: '600',
    marginBottom: 4,
  },
  logMessage: {
    fontSize: 13,
    color: DARK,
    lineHeight: 18,
  },
  logDetails: {
    backgroundColor: '#f9f9f9',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: BORDER,
  },
  detailSection: {
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: PRIMARY,
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 11,
    color: '#666',
    fontFamily: 'Courier New',
    lineHeight: 16,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    color: BORDER,
    marginTop: 12,
  },
});
