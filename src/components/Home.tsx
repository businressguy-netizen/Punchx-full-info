import React from 'react';
import SimpleCustomerHome from './SimpleCustomerHome';
import { AppScreen, Worker } from '../types';

interface HomeProps {
  onTransition: (target: AppScreen) => void;
  onSelectWorker: (worker: Worker) => void;
  onSelectCategory: (category: string) => void;
  hasActiveBooking: boolean;
  promoApplied: boolean;
  hasClaimedBonus?: boolean;
  hasUsedBonus?: boolean;
  onClaimPromo: () => void;
  citizenName: string;
  setCitizenName: (val: string) => void;
  citizenAddress: string;
  setCitizenAddress: (val: string) => void;
  authMethod: 'phone' | 'gmail';
  authTarget: string;
  showNotification: (msg: string) => void;
  onOpenNotificationCenter?: () => void;
  isProfileDrawerOpen?: boolean;
  setIsProfileDrawerOpen?: (val: boolean) => void;
}

export default function Home(props: HomeProps) {
  return (
    <SimpleCustomerHome
      onTransition={props.onTransition}
      onSelectWorker={props.onSelectWorker}
      onSelectCategory={props.onSelectCategory}
      citizenName={props.citizenName}
      citizenAddress={props.citizenAddress}
      onOpenProfile={props.setIsProfileDrawerOpen ? () => props.setIsProfileDrawerOpen?.(true) : undefined}
    />
  );
}
