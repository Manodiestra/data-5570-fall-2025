import { Stack } from "expo-router";
import { Provider } from 'react-redux';
import { store } from '../state/store';

export default function RootLayout() {
  return (
    <Provider store={store}>
      <Stack />
    </Provider>
  );
}
