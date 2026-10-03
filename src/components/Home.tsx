import React from 'react';
import CitizenHomeRedesign from './CitizenHomeRedesign';
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
 * Production citizen entry point.
 * The premium marketplace home is deliberately kept behind the existing
 * Home contract so the rest of the booking/auth architecture does not need
 * to know which visual home implementation is active.
 */
export default function Home(props: HomeProps) {
  return (
    <CitizenHomeRedesign
      onTransition={props.onTransition}
      onSelectWorker={props.onSelectWorker}
      onSelectCategory={props.onSelectCategory}
      citizenName={props.citizenName}
      citizenAddress={props.citizenAddress}
      showNotification={props.showNotification}
      onOpenNotificationCenter={props.onOpenNotificationCenter}
      onOpenProfile={props.setIsProfileDrawerOpen ? () => props.setIsProfileDrawerOpen?.(true) : undefined}
    />
  );
}
