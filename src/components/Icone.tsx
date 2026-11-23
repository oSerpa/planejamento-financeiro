import {
  BookOpen, Briefcase, Bus, Circle, Coffee, Dumbbell, Gift, HeartPulse, Home, Laptop, PawPrint, Plane,
  Repeat, ShieldCheck, Shirt, ShoppingBasket, Smartphone, Ticket, Utensils, Wallet, type LucideProps,
} from 'lucide-react'

const mapa = {
  briefcase: Briefcase,
  laptop: Laptop,
  wallet: Wallet,
  gift: Gift,
  home: Home,
  cart: ShoppingBasket,
  food: Utensils,
  coffee: Coffee,
  bus: Bus,
  ticket: Ticket,
  heart: HeartPulse,
  gym: Dumbbell,
  repeat: Repeat,
  phone: Smartphone,
  book: BookOpen,
  shirt: Shirt,
  pet: PawPrint,
  plane: Plane,
  shield: ShieldCheck,
  circle: Circle,
}

/** Ícones que dá para escolher numa categoria nova. */
// eslint-disable-next-line react-refresh/only-export-components
export const nomesIcones = Object.keys(mapa).filter((n) => n !== 'shield')

export function Icone({ nome, ...props }: { nome: string } & LucideProps) {
  const C = mapa[nome as keyof typeof mapa] ?? Circle
  return <C strokeWidth={1.75} {...props} />
}
