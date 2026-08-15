import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import type { RootStackParamList } from './src/navigation';
import { DailySummaryScreen } from './src/screens/DailySummaryScreen';
import { DrawingBoardScreen } from './src/screens/DrawingBoardScreen';
import { MuffListScreen } from './src/screens/MuffListScreen';
import { ProjectFormScreen } from './src/screens/ProjectFormScreen';
import { ProjectListScreen } from './src/screens/ProjectListScreen';
import { colors } from './src/theme';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <StatusBar style="light" />
        <Stack.Navigator
          screenOptions={{
            headerStyle: { backgroundColor: colors.ink },
            headerTintColor: '#fff',
            headerTitleStyle: { fontWeight: '700' },
            contentStyle: { backgroundColor: colors.bg },
          }}
        >
          <Stack.Screen
            name="ProjectList"
            component={ProjectListScreen}
            options={{ title: 'Muffe Plan' }}
          />
          <Stack.Screen
            name="ProjectForm"
            component={ProjectFormScreen}
            options={({ route }) => ({
              title: route.params?.projectId ? 'Projekt szerkesztése' : 'Új projekt',
            })}
          />
          <Stack.Screen
            name="DrawingBoard"
            component={DrawingBoardScreen}
            options={{ title: 'Rajzlap' }}
          />
          <Stack.Screen
            name="MuffList"
            component={MuffListScreen}
            options={{ title: 'Muffok' }}
          />
          <Stack.Screen
            name="DailySummary"
            component={DailySummaryScreen}
            options={{ title: 'Napi összesítő' }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
