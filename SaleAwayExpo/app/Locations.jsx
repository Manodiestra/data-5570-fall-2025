import React, { useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import { useSelector, useDispatch } from 'react-redux';
import { 
  Text, 
  Button, 
  Card, 
  Title, 
  Paragraph,
  Surface,
  Divider,
  ActivityIndicator,
  IconButton,
} from 'react-native-paper';
import { fetchLocations } from '../state/slices/locationsSlice';

export default function LocationsScreen() {
  const dispatch = useDispatch();
  const { locations, loading, error } = useSelector((state) => state.locations);

  useEffect(() => {
    dispatch(fetchLocations());
  }, [dispatch]);

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <Surface style={styles.header} elevation={2}>
          <View style={styles.headerTop}>
            <IconButton 
              icon="arrow-left" 
              size={24} 
              onPress={() => router.back()}
              style={styles.backButton}
            />
            <Title style={styles.title}>Locations</Title>
            <View style={styles.placeholder} />
          </View>
          <Paragraph style={styles.subtitle}>View and manage your locations</Paragraph>
        </Surface>

        {/* Locations List Section */}
        {loading ? (
          <Card style={styles.loadingState}>
            <Card.Content style={styles.loadingStateContent}>
              <ActivityIndicator size="large" color="#0F2439" />
              <Title style={styles.loadingStateTitle}>Loading locations...</Title>
            </Card.Content>
          </Card>
        ) : error ? (
          <Card style={styles.errorState}>
            <Card.Content style={styles.errorStateContent}>
              <Title style={styles.errorStateTitle}>Error loading locations</Title>
              <Paragraph style={styles.errorStateSubtitle}>{error}</Paragraph>
              <Button 
                mode="contained" 
                onPress={() => dispatch(fetchLocations())}
                style={styles.retryButton}
                buttonColor="#0F2439"
              >
                Retry
              </Button>
            </Card.Content>
          </Card>
        ) : locations.length > 0 ? (
          <View style={styles.locationsContainer}>
            {locations.map((location) => (
              <Card key={location.id} style={styles.locationCard}>
                <Card.Content>
                  <Title style={styles.locationName}>{location.name}</Title>
                  <Paragraph style={styles.locationAddress}>
                    {location.address}
                  </Paragraph>
                  <Paragraph style={styles.locationCity}>
                    {location.city}, {location.state} {location.zip}
                  </Paragraph>
                  {location.created_date && (
                    <Paragraph style={styles.locationDate}>
                      Created: {new Date(location.created_date).toLocaleDateString()}
                    </Paragraph>
                  )}
                </Card.Content>
              </Card>
            ))}
          </View>
        ) : (
          <Card style={styles.emptyState}>
            <Card.Content style={styles.emptyStateContent}>
              <Title style={styles.emptyStateTitle}>No locations yet</Title>
              <Paragraph style={styles.emptyStateSubtitle}>
                Locations will appear here when created
              </Paragraph>
            </Card.Content>
          </Card>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContainer: {
    flexGrow: 1,
    padding: 16,
  },
  header: {
    padding: 20,
    marginBottom: 16,
    borderRadius: 8,
    backgroundColor: 'white',
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  backButton: {
    margin: 0,
  },
  placeholder: {
    width: 40,
  },
  title: {
    textAlign: 'center',
    fontSize: 28,
    fontWeight: 'bold',
  },
  subtitle: {
    textAlign: 'center',
    fontSize: 16,
    opacity: 0.7,
  },
  locationsContainer: {
    gap: 16,
  },
  locationCard: {
    marginBottom: 0,
  },
  locationName: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#0F2439',
  },
  locationAddress: {
    fontSize: 16,
    color: '#2c3e50',
    marginBottom: 4,
  },
  locationCity: {
    fontSize: 15,
    color: '#7f8c8d',
    marginBottom: 8,
  },
  locationDate: {
    fontSize: 12,
    color: '#95a5a6',
    fontStyle: 'italic',
  },
  emptyState: {
    marginTop: 50,
  },
  emptyStateContent: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  emptyStateTitle: {
    textAlign: 'center',
    marginBottom: 8,
    fontSize: 20,
    fontWeight: '600',
    opacity: 0.7,
  },
  emptyStateSubtitle: {
    textAlign: 'center',
    fontSize: 16,
    opacity: 0.5,
  },
  loadingState: {
    marginTop: 50,
  },
  loadingStateContent: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  loadingStateTitle: {
    textAlign: 'center',
    marginTop: 16,
    fontSize: 18,
    fontWeight: '600',
    opacity: 0.7,
  },
  errorState: {
    marginTop: 50,
  },
  errorStateContent: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  errorStateTitle: {
    textAlign: 'center',
    marginBottom: 8,
    fontSize: 20,
    fontWeight: '600',
    color: '#d32f2f',
  },
  errorStateSubtitle: {
    textAlign: 'center',
    fontSize: 16,
    opacity: 0.7,
    marginBottom: 16,
  },
  retryButton: {
    marginTop: 8,
  },
});

