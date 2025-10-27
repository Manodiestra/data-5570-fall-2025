import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

// API base URL
const API_BASE_URL = 'http://3.85.53.16:8000/api/locations/';

const initialState = {
  locations: [],
  loading: false,
  error: null,
  createLoading: false,
  updateLoading: false,
  deleteLoading: false,
};

// Async thunks for REST operations
export const fetchLocations = createAsyncThunk(
  'locations/fetchLocations',
  async (_, { rejectWithValue }) => {
    try {
      const response = await fetch(API_BASE_URL);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      return data;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const createLocation = createAsyncThunk(
  'locations/createLocation',
  async (locationData, { rejectWithValue }) => {
    try {
      // Only send writable fields to Django API
      const payload = {
        name: locationData.name,
        address: locationData.address,
        city: locationData.city,
        state: locationData.state,
        zip: locationData.zip,
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
      return rejectWithValue(error.message);
    }
  }
);

export const updateLocationAsync = createAsyncThunk(
  'locations/updateLocationAsync',
  async ({ id, ...locationData }, { rejectWithValue }) => {
    try {
      // Only send writable fields to Django API
      const payload = {
        name: locationData.name,
        address: locationData.address,
        city: locationData.city,
        state: locationData.state,
        zip: locationData.zip,
      };
      
      const response = await fetch(`${API_BASE_URL}${id}/`, {
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
      return rejectWithValue(error.message);
    }
  }
);

export const deleteLocation = createAsyncThunk(
  'locations/deleteLocation',
  async (id, { rejectWithValue }) => {
    try {
      const response = await fetch(`${API_BASE_URL}${id}/`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return id;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

const locationsSlice = createSlice({
  name: 'locations',
  initialState,
  reducers: {
    addLocations: (state, action) => {
      state.locations = action.payload;
    },
    addLocation: (state, action) => {
      const newLocation = {
        id: action.payload.id || Date.now().toString(),
        name: action.payload.name,
        address: action.payload.address,
        city: action.payload.city,
        state: action.payload.state,
        zip: action.payload.zip,
        created_date: action.payload.created_date || new Date().toISOString(),
        updated_date: action.payload.updated_date || new Date().toISOString(),
      };
      state.locations.push(newLocation);
    },
    removeLocation: (state, action) => {
      state.locations = state.locations.filter(location => location.id !== action.payload);
    },
    updateLocation: (state, action) => {
      const { id, ...updates } = action.payload;
      const locationIndex = state.locations.findIndex(location => location.id === id);
      if (locationIndex !== -1) {
        state.locations[locationIndex] = { ...state.locations[locationIndex], ...updates };
      }
    },
    clearLocations: (state) => {
      state.locations = [];
    },
  },
  extraReducers: (builder) => {
    // Fetch locations
    builder
      .addCase(fetchLocations.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchLocations.fulfilled, (state, action) => {
        state.loading = false;
        state.locations = action.payload;
        state.error = null;
      })
      .addCase(fetchLocations.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // Create location
    builder
      .addCase(createLocation.pending, (state) => {
        state.createLoading = true;
        state.error = null;
      })
      .addCase(createLocation.fulfilled, (state, action) => {
        state.createLoading = false;
        state.locations.push(action.payload);
        state.error = null;
      })
      .addCase(createLocation.rejected, (state, action) => {
        state.createLoading = false;
        state.error = action.payload;
      });

    // Update location
    builder
      .addCase(updateLocationAsync.pending, (state) => {
        state.updateLoading = true;
        state.error = null;
      })
      .addCase(updateLocationAsync.fulfilled, (state, action) => {
        state.updateLoading = false;
        const index = state.locations.findIndex(location => location.id === action.payload.id);
        if (index !== -1) {
          state.locations[index] = action.payload;
        }
        state.error = null;
      })
      .addCase(updateLocationAsync.rejected, (state, action) => {
        state.updateLoading = false;
        state.error = action.payload;
      });

    // Delete location
    builder
      .addCase(deleteLocation.pending, (state) => {
        state.deleteLoading = true;
        state.error = null;
      })
      .addCase(deleteLocation.fulfilled, (state, action) => {
        state.deleteLoading = false;
        state.locations = state.locations.filter(location => location.id !== action.payload);
        state.error = null;
      })
      .addCase(deleteLocation.rejected, (state, action) => {
        state.deleteLoading = false;
        state.error = action.payload;
      });
  },
});

export const { 
  addLocations, 
  addLocation, 
  removeLocation, 
  updateLocation, 
  clearLocations 
} = locationsSlice.actions;

export default locationsSlice.reducer;

