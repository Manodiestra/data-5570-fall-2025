import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';

// API base URL
const API_BASE_URL = 'https://arnold-calling-vol-headers.trycloudflare.com/api/listings/';

// Type definitions
export interface ListItem {
  id: string;
  name: string;
  description: string;
  price: number;
  list_date: string;
  last_edited_date: string;
}

export interface ListItemsState {
  items: ListItem[];
  loading: boolean;
  error: string | null;
  createLoading: boolean;
  updateLoading: boolean;
  deleteLoading: boolean;
}

export interface CreateItemPayload {
  name: string;
  description: string;
  price: number;
}

export interface UpdateItemPayload extends Partial<CreateItemPayload> {
  id: string;
}

const initialState: ListItemsState = {
  items: [],
  loading: false,
  error: null,
  createLoading: false,
  updateLoading: false,
  deleteLoading: false,
};

// Async thunks for REST operations
export const fetchItems = createAsyncThunk<
  ListItem[],
  void,
  { rejectValue: string }
>(
  'listItems/fetchItems',
  async (_, { rejectWithValue }) => {
    try {
      const response = await fetch(API_BASE_URL);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      return data;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch items');
    }
  }
);

export const createItem = createAsyncThunk<
  ListItem,
  CreateItemPayload,
  { rejectValue: string }
>(
  'listItems/createItem',
  async (itemData, { rejectWithValue }) => {
    try {
      // Only send writable fields to Django API
      const payload = {
        name: itemData.name,
        description: itemData.description,
        price: itemData.price,
      };
      
      const response = await fetch(API_BASE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      return data;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to create item');
    }
  }
);

export const updateItemAsync = createAsyncThunk<
  ListItem,
  UpdateItemPayload,
  { rejectValue: string }
>(
  'listItems/updateItemAsync',
  async ({ id, ...itemData }, { rejectWithValue }) => {
    try {
      // Only send writable fields to Django API
      const payload = {
        name: itemData.name,
        description: itemData.description,
        price: itemData.price,
      };
      
      const response = await fetch(`${API_BASE_URL}/${id}/`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      return data;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to update item');
    }
  }
);

export const deleteItem = createAsyncThunk<
  string,
  string,
  { rejectValue: string }
>(
  'listItems/deleteItem',
  async (id, { rejectWithValue }) => {
    try {
      const response = await fetch(`${API_BASE_URL}/${id}/`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return id;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to delete item');
    }
  }
);

const listItemsSlice = createSlice({
  name: 'listItems',
  initialState,
  reducers: {
    addItems: (state, action: PayloadAction<ListItem[]>) => {
      console.log('addItems', action.payload);
      state.items = action.payload;
    },
    addItem: (state, action: PayloadAction<Partial<ListItem>>) => {
      const newItem: ListItem = {
        id: action.payload.id || Date.now().toString(),
        name: action.payload.name || '',
        description: action.payload.description || '',
        price: action.payload.price || 0,
        list_date: action.payload.list_date || new Date().toISOString(),
        last_edited_date: action.payload.last_edited_date || new Date().toISOString(),
      };
      state.items.push(newItem);
    },
    removeItem: (state, action: PayloadAction<string>) => {
      state.items = state.items.filter(item => item.id !== action.payload);
    },
    updateItem: (state, action: PayloadAction<UpdateItemPayload>) => {
      const { id, ...updates } = action.payload;
      const itemIndex = state.items.findIndex(item => item.id === id);
      if (itemIndex !== -1) {
        state.items[itemIndex] = { ...state.items[itemIndex], ...updates };
      }
    },
    clearItems: (state) => {
      state.items = [];
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
  },
  extraReducers: (builder) => {
    // Fetch items
    builder
      .addCase(fetchItems.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchItems.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
        state.error = null;
      })
      .addCase(fetchItems.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Failed to fetch items';
      });

    // Create item
    builder
      .addCase(createItem.pending, (state) => {
        state.createLoading = true;
        state.error = null;
      })
      .addCase(createItem.fulfilled, (state, action) => {
        state.createLoading = false;
        state.items.push(action.payload);
        state.error = null;
      })
      .addCase(createItem.rejected, (state, action) => {
        state.createLoading = false;
        state.error = action.payload || 'Failed to create item';
      });

    // Update item
    builder
      .addCase(updateItemAsync.pending, (state) => {
        state.updateLoading = true;
        state.error = null;
      })
      .addCase(updateItemAsync.fulfilled, (state, action) => {
        state.updateLoading = false;
        const index = state.items.findIndex(item => item.id === action.payload.id);
        if (index !== -1) {
          state.items[index] = action.payload;
        }
        state.error = null;
      })
      .addCase(updateItemAsync.rejected, (state, action) => {
        state.updateLoading = false;
        state.error = action.payload || 'Failed to update item';
      });

    // Delete item
    builder
      .addCase(deleteItem.pending, (state) => {
        state.deleteLoading = true;
        state.error = null;
      })
      .addCase(deleteItem.fulfilled, (state, action) => {
        state.deleteLoading = false;
        state.items = state.items.filter(item => item.id !== action.payload);
        state.error = null;
      })
      .addCase(deleteItem.rejected, (state, action) => {
        state.deleteLoading = false;
        state.error = action.payload || 'Failed to delete item';
      });
  },
});

export const { addItems, addItem, removeItem, updateItem: updateItemLocal, clearItems, setLoading, setError } = listItemsSlice.actions;

export default listItemsSlice.reducer;

