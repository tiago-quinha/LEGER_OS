import { Metadata } from "next";
import { PortfolioView } from "@/components/PortfolioView";

export const metadata: Metadata = {
  title: "Portfolio & Net Worth // LEGER_OS",
  description: "Track multi-asset holdings, stocks, ETFs, crypto, cash balances, and total net worth analytics.",
};

export default function PortfolioPage() {
  return <PortfolioView />;
}
