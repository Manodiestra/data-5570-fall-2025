import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';

// API base URL
const API_BASE_URL = 'http://3.85.53.16:8000/api/locations/';

// Type definitions
export interface Location {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  created_date: string;
  updated_date: string;
}

export interface LocationsState {
  locations: Location[];
  loading: boolean;
  error: string | null;
  createLoading: boolean;
  updateLoading: boolean;
  deleteLoading: boolean;
}

export interface CreateLocationPayload {
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
}

export interface UpdateLocationPayload extends Partial<CreateLocationPayload> {
  id: string;
}

const initialState: LocationsState = {
  locations: [],
  loading: false,
  error: null,
  createLoading: false,
  updateLoading: false,
  deleteLoading: false,
};

// Async thunks for REST operations
export const fetchLocations = createAsyncThunk<
  Location[],
  void,
  { rejectValue: string }
>(
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
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch locations');
    }
  }
);

export const createLocation = createAsyncThunk<
  Location,
  CreateLocationPayload,
  { rejectValue: string }
>(
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
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to create location');
    }
  }
);

export const updateLocationAsync = createAsyncThunk<
  Location,
  UpdateLocationPayload,
  { rejectValue: string }
>(
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
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to update location');
    }
  }
);

export const deleteLocation = createAsyncThunk<
  string,
  string,
  { rejectValue: string }
>(
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
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to delete location');
    }
  }
);

const locationsSlice = createSlice({
  name: 'locations',
  initialState,
  reducers: {
    addLocations: (state, action: PayloadAction<Location[]>) => {
      state.locations = action.payload;
    },
    addLocation: (state, action: PayloadAction<Partial<Location>>) => {
      const newLocation: Location = {
        id: action.payload.id || Date.now().toString(),
        name: action.payload.name || '',
        address: action.payload.address || '',
        city: action.payload.city || '',
        state: action.payload.state || '',
        zip: action.payload.zip || '',
        created_date: action.payload.created_date || new Date().toISOString(),
        updated_date: action.payload.updated_date || new Date().toISOString(),
      };
      state.locations.push(newLocation);
    },
    removeLocation: (state, action: PayloadAction<string>) => {
      state.locations = state.locations.filter(location => location.id !== action.payload);
    },
    updateLocation: (state, action: PayloadAction<UpdateLocationPayload>) => {
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
        state.error = action.payload || 'Failed to fetch locations';
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
        state.error = action.payload || 'Failed to create location';
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
        state.error = action.payload || 'Failed to update location';
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
        state.error = action.payload || 'Failed to delete location';
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

