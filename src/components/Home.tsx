import React from 'react';
import CitizenMarketplaceFlow from './CitizenMarketplaceFlow';
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

/**
 * PunchX citizen entry point.
 * Keeps the existing App contract while routing the customer into the
 * complete marketplace journey: discovery → problem → service/parts → cart
 * → nearby specialist → booking bill → secure checkout.
 */
export default function Home(props: HomeProps) {
  return (
    <CitizenMarketplaceFlow
      onTransition={props.onTransition}
      selectedCategory=""
      onSelectCategory={props.onSelectCategory}
      onSelectWorker={props.onSelectWorker}
      showNotification={props.showNotification}
      citizenName={props.citizenName}
      citizenAddress={props.citizenAddress}
      onOpenNotificationCenter={props.onOpenNotificationCenter}
      onOpenProfile={props.setIsProfileDrawerOpen ? () => props.setIsProfileDrawerOpen?.(true) : undefined}
    />
  );
}
