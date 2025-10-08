import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import { useSelector } from 'react-redux';
import ListItem from '../components/ListItem';

export default function ItemListingScreen() {
  const items = useSelector((state) => state.listItems.items);
  
  const handleAddItem = () => {
    router.push('/AddListItem');
  };

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
          {items.map((item) => (
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
