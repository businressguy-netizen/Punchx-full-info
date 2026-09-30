import React from 'react';
import PdfServiceFlow from './PdfServiceFlow';
import { AppScreen, Worker } from '../types';

interface ProvidersListProps {
  onTransition: (target: AppScreen) => void;
  selectedCategory: string;
  onSelectCategory?: (category: string) => void;
  onSelectWorker: (worker: Worker) => void;
  authMethod: 'phone' | 'gmail';
  authTarget: string;
  showNotification: (msg: string) => void;
  citizenName: string;
  setCitizenName: (name: string) => void;
  citizenAddress: string;
  setCitizenAddress: (addr: string) => void;
}

export default function ProvidersList(props: ProvidersListProps) {
  return <PdfServiceFlow onTransition={props.onTransition} selectedCategory={props.selectedCategory} onSelectCategory={props.onSelectCategory} onSelectWorker={props.onSelectWorker} showNotification={props.showNotification} citizenAddress={props.citizenAddress} setCitizenAddress={props.setCitizenAddress} />;
}
