import React, { useState, useEffect } from 'react';
import { View, Text, FlatList } from 'react-native';
import { supabase } from '../utils/supabase';

type Profile = {
  user_id: string;
  display_name: string | null;
  home_geom?: unknown;
};

const Check = supabase.auth.getSession().then(
    ({ data, error }) => console.log(error ? `Auth error: ${error.message}` : 'Supabase auth OK')
  )
console.log('Check before useEffect' + Check.toString()) // Check is a promise so doesn't print until the promise is resolved
console.log("--------------------------------")

export default function App() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const getProfiles = async () => {
      try {
        const { data, error: err } = await supabase.from('profiles').select();

        if (err) {
          setError(err.message);
          console.error('Error fetching profiles:', err.message);
          return;
        }

        setProfiles(data ?? []);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        setError(message);
        console.error('Error fetching profiles:', message);
      } finally {
        setLoading(false);
      }
    };

    getProfiles();
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>Loading...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>Error: {error}</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text style={{ marginBottom: 8 }}>Profiles</Text>
      {profiles.length === 0 ? (
        <Text>No profiles yet. {Check}</Text>
      ) : (
        <FlatList
          data={profiles}
          keyExtractor={(item) => item.user_id}
          renderItem={({ item }) => (
            <Text>{item.display_name ?? '(no name)'}</Text>
          )}
        />
      )}
    </View>
  );
}
