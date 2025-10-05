/* eslint-disable react-native/no-inline-styles */
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useState } from 'react';
import {
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Alert,
} from 'react-native';
import { requestWidgetUpdate } from 'react-native-android-widget';

const OFFICE_TIMER_STATE_KEY = 'OfficeTimeWidget:state';
const OFFICE_TIMER_HISTORY_KEY = 'OfficeTimeWidget:history';

interface Session {
  date: string;
  startTime: number;
  endTime: number;
  duration: number;
}

interface DailySession {
  date: string;
  sessions: Session[];
  totalDuration: number;
}

export function OfficeTimeScreen() {
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [isStopConfirmation, setIsStopConfirmation] = useState(false);
  const [dailySessions, setDailySessions] = useState<DailySession[]>([]);
  const [currentDuration, setCurrentDuration] = useState(0);

  useEffect(() => {
    loadData();
    const interval = setInterval(() => {
      if (isTimerRunning && startTime) {
        setCurrentDuration(Date.now() - startTime);
      }
    }, 1000);

    // Update widget every 60 seconds if timer is running
    const widgetUpdateInterval = setInterval(() => {
      if (isTimerRunning) {
        requestWidgetUpdate({
          widgetName: 'OfficeTime',
        });
      }
    }, 60000);

    return () => {
      clearInterval(interval);
      clearInterval(widgetUpdateInterval);
    };
  }, [isTimerRunning, startTime]);

  const loadData = async () => {
    try {
      const stateStr = await AsyncStorage.getItem(OFFICE_TIMER_STATE_KEY);
      const state = JSON.parse(stateStr ?? '{}');
      setIsTimerRunning(state.isTimerRunning ?? false);
      setStartTime(state.startTime ?? null);
      setIsStopConfirmation(state.isStopConfirmation ?? false);

      const historyStr = await AsyncStorage.getItem(OFFICE_TIMER_HISTORY_KEY);
      const history: Session[] = JSON.parse(historyStr ?? '[]');

      // Group sessions by date
      const grouped = history.reduce((acc, session) => {
        if (!acc[session.date]) {
          acc[session.date] = [];
        }
        acc[session.date].push(session);
        return acc;
      }, {} as Record<string, Session[]>);

      const dailySessionsArray: DailySession[] = Object.entries(grouped)
        .map(([date, sessions]) => ({
          date,
          sessions,
          totalDuration: sessions.reduce((total, s) => total + s.duration, 0),
        }))
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      setDailySessions(dailySessionsArray);
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const formatDuration = (milliseconds: number) => {
    const hours = Math.floor(milliseconds / (1000 * 60 * 60));
    const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleStartStop = async () => {
    if (isTimerRunning) {
      if (!isStopConfirmation) {
        setIsStopConfirmation(true);
        await AsyncStorage.setItem(
          OFFICE_TIMER_STATE_KEY,
          JSON.stringify({
            isTimerRunning: true,
            startTime,
            isStopConfirmation: true,
          })
        );
        return;
      }

      // Confirm stop
      const endTime = Date.now();
      const duration = endTime - (startTime || 0);
      const todayStr = new Date().toISOString().split('T')[0];

      const newSession: Session = {
        date: todayStr,
        startTime: startTime || 0,
        endTime,
        duration,
      };

      const historyStr = await AsyncStorage.getItem(OFFICE_TIMER_HISTORY_KEY);
      const history: Session[] = JSON.parse(historyStr ?? '[]');
      const newHistory = [...history, newSession];

      await AsyncStorage.setItem(
        OFFICE_TIMER_HISTORY_KEY,
        JSON.stringify(newHistory)
      );

      await AsyncStorage.setItem(
        OFFICE_TIMER_STATE_KEY,
        JSON.stringify({
          isTimerRunning: false,
          startTime: null,
          isStopConfirmation: false,
        })
      );

      setIsTimerRunning(false);
      setStartTime(null);
      setIsStopConfirmation(false);
      setCurrentDuration(0);

      loadData();
      requestWidgetUpdate({
        widgetName: 'OfficeTime',
      });
    } else {
      const newStartTime = Date.now();
      await AsyncStorage.setItem(
        OFFICE_TIMER_STATE_KEY,
        JSON.stringify({
          isTimerRunning: true,
          startTime: newStartTime,
          isStopConfirmation: false,
        })
      );

      setIsTimerRunning(true);
      setStartTime(newStartTime);
      setIsStopConfirmation(false);

      requestWidgetUpdate({
        widgetName: 'OfficeTime',
      });
    }
  };

  const renderSessionItem = ({ item }: { item: DailySession }) => {
    const [expanded, setExpanded] = useState(false);

    return (
      <TouchableOpacity
        style={styles.sessionItem}
        onPress={() => setExpanded(!expanded)}
      >
        <View style={styles.sessionHeader}>
          <Text style={styles.dateText}>
            {new Date(item.date).toLocaleDateString([], {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
            })}
          </Text>
          <Text style={styles.totalText}>
            {formatDuration(item.totalDuration)}
          </Text>
        </View>

        {expanded && (
          <View style={styles.sessionDetails}>
            {item.sessions.map((session, index) => (
              <View key={index} style={styles.sessionDetail}>
                <Text style={styles.timeText}>
                  {formatTime(session.startTime)} - {formatTime(session.endTime)}
                </Text>
                <Text style={styles.durationText}>
                  {formatDuration(session.duration)}
                </Text>
              </View>
            ))}
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.todayCard}>
        <Text style={styles.todayTitle}>Today's Session</Text>
        <Text style={styles.statusText}>
          {isTimerRunning
            ? `Running for ${formatDuration(currentDuration)}`
            : isStopConfirmation
            ? `Confirm Stop - ${formatDuration(currentDuration)}`
            : 'Not Started'}
        </Text>
        <TouchableOpacity
          style={[
            styles.button,
            {
              backgroundColor: isStopConfirmation
                ? '#FFD700'
                : isTimerRunning
                ? '#FF6B6B'
                : '#4CAF50',
            },
          ]}
          onPress={handleStartStop}
        >
          <Text style={styles.buttonText}>
            {isStopConfirmation ? 'Tap to Confirm Stop' : isTimerRunning ? 'Stop' : 'Start'}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.historyContainer}>
        <Text style={styles.historyTitle}>Daily History</Text>
        <FlatList
          data={dailySessions}
          renderItem={renderSessionItem}
          keyExtractor={(item) => item.date}
          showsVerticalScrollIndicator={false}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 16,
  },
  todayCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  todayTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  statusText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 16,
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  historyContainer: {
    flex: 1,
  },
  historyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  sessionItem: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  sessionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  totalText: {
    fontSize: 16,
    color: '#666',
  },
  sessionDetails: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  sessionDetail: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  timeText: {
    fontSize: 14,
    color: '#666',
  },
  durationText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
});