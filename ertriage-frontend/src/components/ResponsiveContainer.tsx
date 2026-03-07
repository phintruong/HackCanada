import React from 'react';
import { View, ScrollView, StyleSheet, ViewStyle } from 'react-native';
import { useResponsive } from '../hooks/useResponsive';

interface Props {
  children: React.ReactNode;
  scroll?: boolean;
  style?: ViewStyle;
  center?: boolean;
}

export default function ResponsiveContainer({ children, scroll, style, center }: Props) {
  const { responsive } = useResponsive();

  const padding = responsive(24, 32, 40);
  const maxWidth = responsive<number | undefined>(undefined, 720, 800);

  const innerStyle: ViewStyle = {
    flex: 1,
    width: '100%',
    maxWidth,
    alignSelf: 'center',
    padding,
    ...(center ? { justifyContent: 'center', alignItems: 'center' } : {}),
    ...style,
  };

  if (scroll) {
    return (
      <ScrollView style={styles.outer} contentContainerStyle={[innerStyle, { flex: undefined }]}>
        {children}
      </ScrollView>
    );
  }

  return (
    <View style={styles.outer}>
      <View style={innerStyle}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: { flex: 1, backgroundColor: '#F5F7FA' },
});
