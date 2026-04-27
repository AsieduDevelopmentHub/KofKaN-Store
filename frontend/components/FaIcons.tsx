"use client";

import {
  Menu,
  Search,
  ChevronLeft,
  Heart,
  ShoppingBag,
  Home,
  Store,
  ShoppingCart,
  ClipboardList,
  User,
  Filter,
  Truck,
  Lock,
  CheckCircle,
  MapPin,
  Headset,
  Users,
  Star,
  Wallet,
} from "lucide-react";

const sz = "h-[1.125rem] w-[1.125rem]";

type IconProps = { className?: string };

export function FaBars({ className = "" }: IconProps) {
  return <Menu className={`${sz} ${className}`} strokeWidth={2} />;
}

export function FaSearch({ className = "" }: IconProps) {
  return <Search className={`${sz} ${className}`} strokeWidth={2} />;
}

export function FaChevronLeft({ className = "" }: IconProps) {
  return <ChevronLeft className={`${sz} ${className}`} strokeWidth={2} />;
}

export function FaHeartOutline({ className = "" }: IconProps) {
  return <Heart className={`${sz} ${className}`} strokeWidth={2} />;
}

export function FaHeartSolid({ className = "" }: IconProps) {
  return <Heart className={`${sz} ${className}`} strokeWidth={2} fill="currentColor" />;
}

export function FaBag({ className = "" }: IconProps) {
  return <ShoppingBag className={`${sz} ${className}`} strokeWidth={2} />;
}

export function FaHome({ className = "" }: IconProps) {
  return <Home className={`h-5 w-5 ${className}`} strokeWidth={2} />;
}

export function FaShop({ className = "" }: IconProps) {
  return <Store className={`h-5 w-5 ${className}`} strokeWidth={2} />;
}

export function FaCart({ className = "" }: IconProps) {
  return <ShoppingCart className={`h-5 w-5 ${className}`} strokeWidth={2} />;
}

export function FaOrders({ className = "" }: IconProps) {
  return <ClipboardList className={`h-5 w-5 ${className}`} strokeWidth={2} />;
}

export function FaAccount({ className = "" }: IconProps) {
  return <User className={`h-5 w-5 ${className}`} strokeWidth={2} />;
}

export function FaFilterIcon({ className = "" }: IconProps) {
  return <Filter className={`h-4 w-4 ${className}`} strokeWidth={2} />;
}

const md = "h-5 w-5";

export function FaTrustTruck({ className = "" }: IconProps) {
  return <Truck className={`${md} ${className}`} strokeWidth={2} />;
}

export function FaTrustLock({ className = "" }: IconProps) {
  return <Lock className={`${md} ${className}`} strokeWidth={2} />;
}

export function FaTrustAuthentic({ className = "" }: IconProps) {
  return <CheckCircle className={`${md} ${className}`} strokeWidth={2} />;
}

export function FaLocationPin({ className = "" }: IconProps) {
  return <MapPin className={`${md} ${className}`} strokeWidth={2} />;
}

export function FaHeadset({ className = "" }: IconProps) {
  return <Headset className={`${md} ${className}`} strokeWidth={2} />;
}

export function FaFacebook({ className = "" }: IconProps) {
  return <Users className={`${md} ${className}`} strokeWidth={2} />;
}

export function FaInstagram({ className = "" }: IconProps) {
  return <Star className={`${md} ${className}`} strokeWidth={2} />;
}

export function FaTwitter({ className = "" }: IconProps) {
  return <Search className={`${md} ${className}`} strokeWidth={2} />;
}

export function FaCreditCard({ className = "" }: IconProps) {
  return <Wallet className={`${md} ${className}`} strokeWidth={2} />;
}

export function FaLock({ className = "" }: IconProps) {
  return <Lock className={`${md} ${className}`} strokeWidth={2} />;
}
