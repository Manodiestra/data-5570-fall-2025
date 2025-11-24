import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { useDispatch } from 'react-redux';
import { IconButton } from 'react-native-paper';
import { deleteItem } from '../state/slices/listItemsSlice';

const ListItem = ({ item }) => {
  const dispatch = useDispatch();

  const handleDelete = () => {
    dispatch(deleteItem(item.id));
  };

  return (
    <View style={styles.card}>
      {item.image_url && (
        <Image
          source={{ uri: item.image_url }}
          style={styles.image}
          contentFit="cover"
          transition={200}
        />
      )}
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.itemName}>{item.name}</Text>
          <View style={styles.headerRight}>
            <Text style={styles.price}>${parseFloat(item.price).toFixed(2)}</Text>
            <IconButton
              icon="delete"
              iconColor="#e74c3c"
              size={20}
              onPress={handleDelete}
              style={styles.deleteButton}
            />
          </View>
        </View>
        <Text style={styles.description}>{item.description}</Text>
        <Text style={styles.date}>
          Listed: {new Date(item.list_date).toLocaleDateString()}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
    borderLeftWidth: 4,
    borderLeftColor: '#3498db',
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: 200,
    backgroundColor: '#e1e8ed',
  },
  content: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  itemName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2c3e50',
    flex: 1,
    marginRight: 10,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  price: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#27ae60',
  },
  deleteButton: {
    margin: 0,
    marginLeft: 4,
  },
  description: {
    fontSize: 14,
    color: '#7f8c8d',
    lineHeight: 20,
    marginBottom: 8,
  },
  date: {
    fontSize: 12,
    color: '#95a5a6',
    fontStyle: 'italic',
  },
});

export default ListItem;


