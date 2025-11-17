import { Stack } from "expo-router";
import { Provider } from 'react-redux';
import { store } from '../state/store';
import TokenRefreshManager from '../components/TokenRefreshManager';

export default function RootLayout() {
  return (
    <Provider store={store}>
      <TokenRefreshManager />
      <Stack />
    </Provider>
  );
}
