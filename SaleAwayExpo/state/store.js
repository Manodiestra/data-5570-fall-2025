import { configureStore } from '@reduxjs/toolkit';
import listItemsReducer from './slices/listItemsSlice';

export const store = configureStore({
  reducer: {
    listItems: listItemsReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
