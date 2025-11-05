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
  FAB,
  IconButton,
  ActivityIndicator,
} from 'react-native-paper';
import ListItem from '../components/ListItem';
import { fetchItems } from '../state/slices/listItemsSlice';



export default function ItemListingScreen() {
  const dispatch = useDispatch();
  const { items, loading, error } = useSelector((state) => state.listItems);

  const handleAddItem = () => {
    router.push('/AddListItem');
  };

  useEffect(() => {
    dispatch(fetchItems());
  }, [dispatch]);

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <Surface style={styles.header} elevation={2}>
          <Title style={styles.title}>Item Listings</Title>
          <Paragraph style={styles.subtitle}>View and manage your listed items</Paragraph>
          
          <View style={styles.buttonContainer}>
            <Button 
              mode="contained" 
              onPress={handleAddItem}
              style={styles.addButton}
              buttonColor="navy"
              icon="plus"
            >
              Add New Item
            </Button>
            
            <IconButton 
              icon="cog" 
              size={24} 
              onPress={() => router.push('/Settings')}
              style={styles.settingsButton}
            />
          </View>
          
          <View style={styles.secondaryButtonContainer}>
            <Button 
              mode="outlined" 
              onPress={() => router.push('/Locations')}
              style={styles.locationsButton}
              icon="map-marker"
            >
              View Locations
            </Button>
          </View>
        </Surface>

        {/* Items List Section */}
        {loading ? (
          <Card style={styles.loadingState}>
            <Card.Content style={styles.loadingStateContent}>
              <ActivityIndicator size="large" color="#0F2439" />
              <Title style={styles.loadingStateTitle}>Loading items...</Title>
            </Card.Content>
          </Card>
        ) : error ? (
          <Card style={styles.errorState}>
            <Card.Content style={styles.errorStateContent}>
              <Title style={styles.errorStateTitle}>Error loading items</Title>
              <Paragraph style={styles.errorStateSubtitle}>{error}</Paragraph>
              <Button 
                mode="contained" 
                onPress={() => dispatch(fetchItems())}
                style={styles.retryButton}
                buttonColor="#0F2439"
              >
                Retry
              </Button>
            </Card.Content>
          </Card>
        ) : items.length > 0 ? (
          <Card style={styles.itemsSection}>
            <Card.Content>
              <Title style={styles.itemsSectionTitle}>
                Your Listed Items ({items.length})
              </Title>
              <Divider style={styles.divider} />
              {items.map((item) => (
                  <ListItem key={item.id} item={item} />
              ))}
            </Card.Content>
          </Card>
        ) : (
          <Card style={styles.emptyState}>
            <Card.Content style={styles.emptyStateContent}>
              <Title style={styles.emptyStateTitle}>No items listed yet</Title>
              <Paragraph style={styles.emptyStateSubtitle}>
                Tap "Add New Item" to get started
              </Paragraph>
            </Card.Content>
          </Card>
        )}
      </ScrollView>
      
      <FAB
        style={styles.fab}
        icon="plus"
        onPress={handleAddItem}
        label="Add Item"
        color="#0F2439"
      />
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
  title: {
    textAlign: 'center',
    marginBottom: 8,
    fontSize: 28,
    fontWeight: 'bold',
  },
  subtitle: {
    textAlign: 'center',
    marginBottom: 20,
    fontSize: 16,
    opacity: 0.7,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  addButton: {
    flex: 1,
    marginRight: 8,
  },
  settingsButton: {
    margin: 0,
  },
  secondaryButtonContainer: {
    marginTop: 12,
  },
  locationsButton: {
    width: '100%',
  },
  itemsSection: {
    marginBottom: 16,
  },
  itemsSectionTitle: {
    textAlign: 'center',
    marginBottom: 16,
    fontSize: 20,
    fontWeight: 'bold',
  },
  divider: {
    marginBottom: 16,
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
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
  },
});

