import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { InstallButton } from './src/components/InstallButton';
import type { RootStackParamList } from './src/navigation';
import { registerWebApp } from './src/pwa';
import { DailySummaryScreen } from './src/screens/DailySummaryScreen';
import { DrawingBoardScreen } from './src/screens/DrawingBoardScreen';
import { MuffListScreen } from './src/screens/MuffListScreen';
import { ProjectFormScreen } from './src/screens/ProjectFormScreen';
import { ProjectListScreen } from './src/screens/ProjectListScreen';
import { TodayWorkScreen } from './src/screens/TodayWorkScreen';
import { colors } from './src/theme';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  useEffect(() => {
    registerWebApp();
  }, []);

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <StatusBar style="light" />
        <Stack.Navigator
          initialRouteName="TodayWork"
          screenOptions={{
            headerStyle: { backgroundColor: colors.ink },
            headerTintColor: '#fff',
            headerTitleStyle: { fontWeight: '800', fontSize: 18 },
            headerShadowVisible: false,
            contentStyle: { backgroundColor: colors.bg },
            animation: 'fade_from_bottom',
            animationDuration: 240,
            headerRight: () => <InstallButton />,
          }}
        >
          <Stack.Screen name="TodayWork" component={TodayWorkScreen} options={{ title: 'Muffe Plan' }} />
          <Stack.Screen name="ProjectList" component={ProjectListScreen} options={{ title: 'Baustellék' }} />
          <Stack.Screen
            name="ProjectForm"
            component={ProjectFormScreen}
            options={({ route }) => ({
              title: route.params?.projectId ? 'Baustelle szerkesztése' : 'Új Baustelle',
            })}
          />
          <Stack.Screen name="DrawingBoard" component={DrawingBoardScreen} options={{ title: 'Skicc' }} />
          <Stack.Screen name="MuffList" component={MuffListScreen} options={{ title: 'Tételek' }} />
          <Stack.Screen name="DailySummary" component={DailySummaryScreen} options={{ title: 'Napi összesítő' }} />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
