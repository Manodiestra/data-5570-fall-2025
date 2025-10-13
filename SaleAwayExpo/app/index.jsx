import React, { useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import { useSelector, useDispatch } from 'react-redux';
import ListItem from '../components/ListItem';
import { addItems } from '../state/slices/listItemsSlice';


function isExpired(expirationDate) {
  if (!expirationDate) {
    return false;
  }
  return new Date(expirationDate) < new Date();
}

export default function ItemListingScreen() {
  const dispatch = useDispatch();
  const items = useSelector((state) => state.listItems.items);

  const handleAddItem = () => {
    router.push('/AddListItem');
  };

  useEffect(() => {
    dispatch(addItems([
      {
        id: '1',
        name: 'Vintage Leather Jacket',
        expirationDate: '2025-12-31',
        description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris.',
        price: 89.99,
        createdAt: '2024-01-15T10:30:00.000Z',
      },
      {
        id: '2',
        expirationDate: '2025-12-31',
        name: 'Wireless Bluetooth Headphones',
        description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.',
        price: 129.50,
        createdAt: '2024-01-14T14:20:00.000Z',
      },
      {
        id: '3',
        expirationDate: '2025-12-31',
        name: 'Coffee Maker Deluxe',
        description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.',
        price: 199.99,
        createdAt: '2024-01-13T09:15:00.000Z',
      },
      {
        id: '4',
        expirationDate: '2025-10-12',
        name: 'Smart Watch Series 8',
        description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium.',
        price: 299.00,
        createdAt: '2024-01-12T16:45:00.000Z',
      },
      {
        id: '5',  
        expirationDate: null,
        name: 'Antique Wooden Bookshelf',
        description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt.',
        price: 450.00,
        createdAt: '2024-01-11T11:30:00.000Z',
      },
      {
        id: '6',
        expirationDate: null,
        name: 'Gaming Mechanical Keyboard',
        description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores.',
        price: 159.99,
        createdAt: '2024-01-10T13:20:00.000Z',
      },]));
  }, []);

  return (
    <ScrollView contentContainerStyle={styles.scrollContainer}>
      <View style={styles.header}>
        <Text style={styles.title}>Item Listings</Text>
        <Text style={styles.subtitle}>View and manage your listed items</Text>
        <TouchableOpacity 
          style={styles.addButton} 
          onPress={handleAddItem}
        >
          <Text style={styles.addButtonText}>+ Add New Item</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.settingsButton} 
          onPress={() => router.push('/Settings')}
        >
          <Text style={styles.settingsButtonText}>Settings</Text>
        </TouchableOpacity>
      </View>

      {/* Items List Section */}
      {items.length > 0 ? (
        <View style={styles.itemsSection}>
          <Text style={styles.itemsSectionTitle}>Your Listed Items ({items.length})</Text>
          {items.map((item) => (isExpired(item.expirationDate)) ? null : (
              <ListItem key={item.id} item={item} />
          ))}
        </View>
      ) : (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateTitle}>No items listed yet</Text>
          <Text style={styles.emptyStateSubtitle}>Tap "Add New Item" to get started</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    flexGrow: 1,
    padding: 20,
    backgroundColor: '#f8f9fa',
  },
  header: {
    marginBottom: 30,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#7f8c8d',
    marginBottom: 20,
  },
  addButton: {
    backgroundColor: '#27ae60',
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginBottom: 12,
    shadowColor: '#27ae60',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 3.84,
    elevation: 5,
  },
  addButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  settingsButton: {
    backgroundColor: '#95a5a6',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  settingsButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  itemsSection: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#e1e8ed',
  },
  itemsSectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 16,
    textAlign: 'center',
  },
  emptyState: {
    alignItems: 'center',
    marginTop: 50,
    paddingHorizontal: 20,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#7f8c8d',
    marginBottom: 8,
  },
  emptyStateSubtitle: {
    fontSize: 16,
    color: '#95a5a6',
    textAlign: 'center',
  },
});
