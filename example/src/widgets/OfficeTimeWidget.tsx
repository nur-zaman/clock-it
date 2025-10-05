/* eslint-disable react-native/no-inline-styles */
import React from 'react';
import { FlexWidget, TextWidget } from 'react-native-android-widget';

interface OfficeTimeWidgetProps {
  yesterdayTotal: string;
  isTimerRunning: boolean;
  timerValue: string;
  isStopConfirmation: boolean;
}

export function OfficeTimeWidget({
  yesterdayTotal = '0h 0m',
  isTimerRunning = false,
  timerValue = 'Not Started',
  isStopConfirmation = false,
}: OfficeTimeWidgetProps) {
  return (
    <FlexWidget
      style={{
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        height: 'match_parent',
        width: 'match_parent',
        borderRadius: 32,
        flexDirection: 'row',
        paddingHorizontal: 24,
      }}
    >
      <FlexWidget
        style={{
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <TextWidget style={{ fontSize: 12 }} text="Yesterday" />
        <TextWidget style={{ fontSize: 24, fontWeight: 'bold' }} text={yesterdayTotal} />
      </FlexWidget>
      <FlexWidget
        style={{
          backgroundColor: isStopConfirmation
            ? '#FFD700'
            : isTimerRunning
            ? '#FF6B6B'
            : '#4CAF50',
          paddingVertical: 12,
          paddingHorizontal: 24,
          borderRadius: 16,
        }}
        clickAction={
          isStopConfirmation ? 'CONFIRM_STOP' : isTimerRunning ? 'STOP' : 'START'
        }
      >
        <TextWidget
          style={{ fontSize: 18, color: '#FFFFFF', fontWeight: 'bold' }}
          text={
            isStopConfirmation
              ? 'Tap to confirm'
              : isTimerRunning
              ? `Stop (${timerValue})`
              : 'Start'
          }
        />
      </FlexWidget>
    </FlexWidget>
  );
}