import { configureStore } from '@reduxjs/toolkit';
import listItemsReducer from './slices/listItemsSlice';
import locationsReducer from './slices/locationsSlice';

export const store = configureStore({
  reducer: {
    listItems: listItemsReducer,
    locations: locationsReducer,
  },
});
