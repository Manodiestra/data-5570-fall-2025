import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  items: [],
  loading: false,
  error: null,
};


const listItemsSlice = createSlice({
  name: 'listItems',
  initialState,
  reducers: {
    addItem: (state, action) => {
      const newItem = {
        id: action.payload.id || Date.now().toString(),
        name: action.payload.name,
        description: action.payload.description,
        price: action.payload.price,
        createdAt: action.payload.createdAt || new Date().toISOString(),
      };
      state.items.push(newItem);
    },
    removeItem: (state, action) => {
      state.items = state.items.filter(item => item.id !== action.payload);
    },
    updateItem: (state, action) => {
      const { id, ...updates } = action.payload;
      const itemIndex = state.items.findIndex(item => item.id === id);
      if (itemIndex !== -1) {
        state.items[itemIndex] = { ...state.items[itemIndex], ...updates };
      }
    },
    clearItems: (state) => {
      state.items = [];
    },
    setLoading: (state, action) => {
      state.loading = action.payload;
    },
    setError: (state, action) => {
      state.error = action.payload;
    },
  },
});

export const { addItem, removeItem, updateItem, clearItems, setLoading, setError } = listItemsSlice.actions;

export default listItemsSlice.reducer;
