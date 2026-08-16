import { BedDouble, LampDesk, Sofa, Tv } from "lucide-react";

export const categoryCardsInfo = [
  {
    id: 1,
    name: "ارضيات",
    icon: (
      <Sofa
        style={{ width: "40px", height: "40px" }}
        className="text-primary"
      />
    ),
    href: `/category/${encodeURIComponent("ارضيات")}`,
  },
  {
    id: 2,
    name: "اثاث",
    icon: (
      <BedDouble
        style={{ width: "40px", height: "40px" }}
        className="text-primary group-hover/button:text-primary/90"
      />
    ),
    href: `/category/${encodeURIComponent("اثاث")}`,
  },
  {
    id: 3,
    name: "كهربا",
    icon: (
      <Tv
        style={{ width: "40px", height: "40px" }}
        className="text-primary group-hover/button:text-primary/90"
      />
    ),
    href: `/category/${encodeURIComponent("كهربا")}`,
  },
  {
    id: 4,
    name: "سباكة",
    icon: (
      <LampDesk
        style={{ width: "40px", height: "40px" }}
        className="text-primary group-hover/button:text-primary/90"
      />
    ),
    href: `/category/${encodeURIComponent("سباكة")}`,
  },
  {
    id: 5,
    name: "مطابخ",
    icon: (
      <BedDouble
        style={{ width: "40px", height: "40px" }}
        className="text-primary group-hover/button:text-primary/90"
      />
    ),
    href: `/category/${encodeURIComponent("مطابخ")}`,
  },
];
