import {
  BookOpen, Briefcase, Bus, HeartPulse, Home, Laptop, Plane, Repeat, ShieldCheck,
  ShoppingBasket, Ticket, Circle, type LucideProps,
} from 'lucide-react'

const mapa = {
  briefcase: Briefcase,
  laptop: Laptop,
  home: Home,
  cart: ShoppingBasket,
  bus: Bus,
  ticket: Ticket,
  heart: HeartPulse,
  repeat: Repeat,
  book: BookOpen,
  shield: ShieldCheck,
  plane: Plane,
}

export function Icone({ nome, ...props }: { nome: string } & LucideProps) {
  const C = mapa[nome as keyof typeof mapa] ?? Circle
  return <C strokeWidth={1.75} {...props} />
}
