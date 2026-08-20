import React from 'react';
import AppLayout from '../layouts/AppLayout';
import BuildingScreen from '../components/BuildingScreen';

export default function Building({ title }) {
  return (
    <AppLayout title={title}>
      <BuildingScreen title={title} />
    </AppLayout>
  );
}
