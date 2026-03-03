import { useQuery } from "@tanstack/react-query";
import { useState, useEffect, useMemo } from "react";
import { Settings, DollarSign } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import decorationImg from "@assets/image_1772518583353.png";

interface Donation {
  id: string;
  amount: number;
  currency: string;
  donorName: string;
  donorEmail: string;
  message: string;
  createdAt: string;
  status: string;
}

interface Config {
  id: number;
  formId: string;
  goalAmount: number;
  updatedAt: string;
}

function QRCodeSection({ formId }: { formId: string }) {
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=https://charitystack.com/donate/${formId}&bgcolor=FFFFFF&color=000000&format=png`;

  return (
    <div className="flex flex-col items-center gap-4" data-testid="qr-section">
      <h3 className="text-lg font-semibold text-foreground">Scan to Donate</h3>
      <div className="bg-white p-4 rounded-xl shadow-lg">
        <img
          src={qrUrl}
          alt="Scan to donate"
          className="w-56 h-56 md:w-64 md:h-64"
          data-testid="qr-code-image"
        />
      </div>
    </div>
  );
}

function Thermometer({ percentage }: { percentage: number }) {
  const clampedPct = Math.min(Math.max(percentage, 0), 100);
  const fillHeight = Math.max(clampedPct, 3);

  return (
    <div className="flex flex-col items-center" data-testid="thermometer">
      <div className="relative w-24 h-72 md:h-80">
        <div className="absolute inset-0 rounded-full bg-slate-700/60 border border-slate-600/40" />
        <div
          className="absolute bottom-0 left-0 right-0 rounded-full transition-all duration-1000 ease-out"
          style={{
            height: `${fillHeight}%`,
            background: `linear-gradient(to top, #ef4444, #f97316, #eab308, #22c55e)`,
            backgroundSize: `100% ${(100 / fillHeight) * 100}%`,
            backgroundPosition: 'bottom',
          }}
          data-testid="thermometer-fill"
        />
      </div>
      <div
        className="w-32 h-32 -mt-4 rounded-full border-2 border-slate-600/40 relative"
        style={{
          background: clampedPct > 0
            ? `linear-gradient(to top, #ef4444, #f97316, #eab308)`
            : 'rgb(51 65 85 / 0.6)',
        }}
      >
        <div
          className="absolute inset-1 rounded-full"
          style={{
            background: clampedPct > 0
              ? `linear-gradient(to top, #ef4444, #f97316)`
              : 'rgb(51 65 85 / 0.6)',
          }}
        />
      </div>
    </div>
  );
}

function DonationCard({ donation }: { donation: Donation }) {
  const formattedAmount = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(donation.amount / 100);

  const formattedDate = new Date(donation.createdAt).toLocaleString('en-US', {
    month: 'numeric',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });

  return (
    <div
      className="flex items-center justify-between p-4 rounded-lg border border-slate-600/40 bg-card/50"
      data-testid={`donation-card-${donation.id}`}
    >
      <div className="flex flex-col gap-0.5">
        <span className="font-semibold text-foreground" data-testid={`donor-name-${donation.id}`}>
          {donation.donorName}
        </span>
        <span className="text-xs text-muted-foreground">{formattedDate}</span>
      </div>
      <span className="text-lg font-bold text-primary" data-testid={`donation-amount-${donation.id}`}>
        {formattedAmount}
      </span>
    </div>
  );
}

function SettingsDialog({ config, onSave }: { config: Config; onSave: (formId: string, goalAmount: number) => void }) {
  const [formId, setFormId] = useState(config.formId);
  const [goalAmount, setGoalAmount] = useState(config.goalAmount.toString());
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setFormId(config.formId);
    setGoalAmount(config.goalAmount.toString());
  }, [config]);

  const handleSave = () => {
    const parsedGoal = parseInt(goalAmount, 10);
    if (!formId.trim()) return;
    if (isNaN(parsedGoal) || parsedGoal <= 0) return;
    onSave(formId.trim(), parsedGoal);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="text-muted-foreground" data-testid="button-settings">
          <Settings className="h-5 w-5" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Fundraising Settings</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4 pt-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="formId">CharityStack Form ID</Label>
            <Input
              id="formId"
              value={formId}
              onChange={(e) => setFormId(e.target.value)}
              placeholder="Enter form ID"
              data-testid="input-form-id"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="goalAmount">Goal Amount ($)</Label>
            <Input
              id="goalAmount"
              type="number"
              value={goalAmount}
              onChange={(e) => setGoalAmount(e.target.value)}
              placeholder="50000"
              data-testid="input-goal-amount"
            />
          </div>
          <Button onClick={handleSave} data-testid="button-save-settings">Save</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function Home() {
  const { toast } = useToast();

  const { data: configData, isLoading: configLoading, error: configError } = useQuery<Config>({
    queryKey: ["/api/config"],
    refetchInterval: 30000,
  });

  const { data: donations, isLoading: donationsLoading, error: donationsError } = useQuery<Donation[]>({
    queryKey: ["/api/donations"],
    refetchInterval: 30000,
  });

  const totalRaised = useMemo(() => {
    if (!donations) return 0;
    console.log("[App] Calculating total from donations:", donations.length, "donations");
    return donations.reduce((sum, d) => sum + d.amount, 0) / 100;
  }, [donations]);

  const goalAmount = configData?.goalAmount || 50000;
  const percentage = goalAmount > 0 ? (totalRaised / goalAmount) * 100 : 0;

  useEffect(() => {
    if (donations) {
      console.log("[App] Donations updated:", {
        count: donations.length,
        totalRaised,
        ...(donations.length > 0 ? {
          firstDonation: donations[0]?.donorName,
          lastDonation: donations[donations.length - 1]?.donorName,
        } : {}),
      });
    }
  }, [donations, totalRaised]);

  useEffect(() => {
    if (configData) {
      console.log("[App] Config loaded:", {
        formId: configData.formId,
        goalAmount: configData.goalAmount,
      });
    }
  }, [configData]);

  const handleSaveConfig = async (formId: string, newGoalAmount: number) => {
    try {
      await apiRequest("PUT", "/api/config", { formId, goalAmount: newGoalAmount });
      queryClient.invalidateQueries({ queryKey: ["/api/config"] });
      queryClient.invalidateQueries({ queryKey: ["/api/donations"] });
      toast({ title: "Settings saved", description: "Configuration updated successfully." });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const formattedTotal = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(totalRaised);

  const formattedGoal = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(goalAmount);

  const sortedDonations = useMemo(() => {
    if (!donations) return [];
    return [...donations].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [donations]);

  if (configLoading || donationsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground" data-testid="text-loading">Loading fundraiser data...</p>
        </div>
      </div>
    );
  }

  if (configError || donationsError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4 text-center px-4">
          <p className="text-destructive text-lg font-semibold" data-testid="text-error">Failed to load fundraiser data</p>
          <p className="text-muted-foreground text-sm">
            {(configError as Error)?.message || (donationsError as Error)?.message || "Please try again later."}
          </p>
          <Button onClick={() => window.location.reload()} data-testid="button-retry">Retry</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background relative overflow-hidden" data-testid="home-page">
      <div className="absolute top-4 left-4 flex items-center gap-2 z-10">
        <span className="relative flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
        </span>
        <span className="text-sm font-semibold text-foreground" data-testid="text-live-indicator">LIVE</span>
      </div>

      <div className="absolute top-4 right-4 z-10">
        {configData && <SettingsDialog config={configData} onSave={handleSaveConfig} />}
      </div>

      <div className="min-h-screen flex flex-col lg:flex-row items-center justify-center gap-8 lg:gap-12 px-6 py-16">
        <div className="flex-shrink-0">
          <QRCodeSection formId={configData?.formId || ""} />
        </div>

        <div className="flex flex-col items-center gap-4">
          <h1 className="text-3xl md:text-4xl font-bold text-foreground" data-testid="text-title">Fundraising Goal</h1>
          <p className="text-4xl md:text-5xl font-extrabold text-primary" data-testid="text-total-raised">{formattedTotal}</p>
          <p className="text-lg text-muted-foreground" data-testid="text-goal">of {formattedGoal}</p>
          <p className="text-sm font-medium text-primary" data-testid="text-percentage">{percentage.toFixed(1)}% Complete</p>
          <Thermometer percentage={percentage} />
          <p className="text-sm text-muted-foreground mt-2" data-testid="text-donor-count">
            {donations?.length || 0} Donors
          </p>
        </div>

        <div className="w-full max-w-sm flex flex-col gap-3 max-h-[70vh]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-primary" />
              <h2 className="text-xl font-bold text-foreground" data-testid="text-supporters-title">Recent Supporters</h2>
            </div>
          </div>
          <div className="flex flex-col gap-2 overflow-y-auto pr-1" data-testid="donations-list">
            {sortedDonations.map((donation) => (
              <DonationCard key={donation.id} donation={donation} />
            ))}
            {sortedDonations.length === 0 && (
              <p className="text-center text-muted-foreground py-8" data-testid="text-no-donations">
                No donations yet. Be the first to contribute!
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 pointer-events-none">
        <img src={decorationImg} alt="Footer decoration" className="w-full opacity-40" />
      </div>
    </div>
  );
}
