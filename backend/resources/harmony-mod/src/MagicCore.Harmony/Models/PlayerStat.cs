using System;
using System.Collections.Generic;
using Newtonsoft.Json;

namespace MagicCore
{
    public sealed class PlayerStat
    {
        [JsonIgnore] public ulong SteamId;
        [JsonIgnore] public DateTime LoginTime;
        [JsonIgnore] public DateTime? LogoffTime;
        [JsonIgnore] public string UserName;

        public int Kills;
        public int Deaths;
        public int Suicides;
        public int BulletsFired;
        public int HeadShots;
        public int TimedExplosivesThrown;
        public int RocketsFired;
        public int HvRocketsFired;
        public int IncendiaryRocketsFired;
        public int SmokeRocketsFired;
        public int SatchelChargesThrown;
        public int HeGrenadeFired;
        public int WoodFarmed;
        public int StoneFarmed;
        public int MetalFarmed;
        public int HqmFarmed;
        public int SulfurFarmed;
        public int CornHarvested;
        public int PotatoesHarvested;
        public int PumpkinsHarvested;
        public int MushroomsHarvested;
        public int BerriesHarvested;
        public int FishGutted;
        public int ClothCollected;
        public int LeatherCollected;
        public int HackedCratesLooted;
        public int HeliKills;
        public int BradleyKills;
        public int MissionsStarted;
        public int MissionsCompleted;
        public int NpcKills;
        public int BoatsPurchased;
        public int SubPurchased;
        public int HelisPurchased;
        public int AnimalKills;
        public int SupplySignalThrown;

        public int PlayTimeSeconds =>
            (int)((LogoffTime ?? DateTime.Now) - LoginTime).TotalSeconds + 1;

        public bool HasActivity()
        {
            return Kills + Deaths + Suicides + BulletsFired + HeadShots
                   + TimedExplosivesThrown + RocketsFired + HvRocketsFired + IncendiaryRocketsFired
                   + SmokeRocketsFired + SatchelChargesThrown + HeGrenadeFired
                   + WoodFarmed + StoneFarmed + MetalFarmed + HqmFarmed + SulfurFarmed
                   + CornHarvested + PotatoesHarvested + PumpkinsHarvested + MushroomsHarvested
                   + BerriesHarvested + FishGutted + ClothCollected + LeatherCollected
                   + HackedCratesLooted + HeliKills + BradleyKills + MissionsStarted + MissionsCompleted
                   + NpcKills + BoatsPurchased + SubPurchased + HelisPurchased + AnimalKills
                   + SupplySignalThrown > 0;
        }

        public Dictionary<string, int> ToPayload()
        {
            var map = new Dictionary<string, int>();
            Add(map, "kills", "A1", Kills);
            Add(map, "deaths", "A2", Deaths);
            Add(map, "suicides", "A3", Suicides);
            Add(map, "bullets_fired", "A4", BulletsFired);
            Add(map, "headshots", "A5", HeadShots);
            Add(map, "c4_thrown", "B1", TimedExplosivesThrown);
            Add(map, "rockets_fired", "B2", RocketsFired);
            Add(map, "hv_rockets_fired", "B3", HvRocketsFired);
            Add(map, "incendiary_rockets_fired", "B4", IncendiaryRocketsFired);
            Add(map, "smoke_rockets_fired", "B5", SmokeRocketsFired);
            Add(map, "satches_thrown", "B6", SatchelChargesThrown);
            Add(map, "he_grenades_fired", "B7", HeGrenadeFired);
            Add(map, "wood_farmed", "C1", WoodFarmed);
            Add(map, "stone_farmed", "C2", StoneFarmed);
            Add(map, "metal_frags_farmed", "C3", MetalFarmed);
            Add(map, "hqm_farmed", "C4", HqmFarmed);
            Add(map, "sulfur_farmed", "C5", SulfurFarmed);
            Add(map, "corn_harvested", "D1", CornHarvested);
            Add(map, "potatoes_harvested", "D2", PotatoesHarvested);
            Add(map, "pumpkins_harvested", "D3", PumpkinsHarvested);
            Add(map, "mushrooms_harvested", "D4", MushroomsHarvested);
            Add(map, "berries_harvested", "D5", BerriesHarvested);
            Add(map, "fish_gutted", "D6", FishGutted);
            Add(map, "cloth_collected", "D7", ClothCollected);
            Add(map, "leather_harvested", "D8", LeatherCollected);
            Add(map, "hacked_crates_looted", "E1", HackedCratesLooted);
            Add(map, "heli_kills", "E2", HeliKills);
            Add(map, "bradley_kills", "E3", BradleyKills);
            Add(map, "missions_started", "E4", MissionsStarted);
            Add(map, "missions_completed", "E5", MissionsCompleted);
            Add(map, "npc_kills", "E6", NpcKills);
            Add(map, "time_played", "F1", PlayTimeSeconds);
            Add(map, "boats_purchased", "F2", BoatsPurchased);
            Add(map, "subs_purchased", "F3", SubPurchased);
            Add(map, "helis_purchased", "F4", HelisPurchased);
            Add(map, "animal_kills", "F5", AnimalKills);
            Add(map, "supply_signals_called", "F6", SupplySignalThrown);
            return map;
        }

        private static void Add(Dictionary<string, int> map, string key, string code, int value)
        {
            if (value == 0)
            {
                return;
            }

            map[key] = value;
            map[code] = value;
            map[code.ToLowerInvariant()] = value;
        }

        public void ResetTimer(DateTime now)
        {
            LoginTime = now;
            LogoffTime = null;
            Kills = Deaths = Suicides = BulletsFired = HeadShots = 0;
            TimedExplosivesThrown = RocketsFired = HvRocketsFired = IncendiaryRocketsFired = 0;
            SmokeRocketsFired = SatchelChargesThrown = HeGrenadeFired = 0;
            WoodFarmed = StoneFarmed = MetalFarmed = HqmFarmed = SulfurFarmed = 0;
            CornHarvested = PotatoesHarvested = PumpkinsHarvested = MushroomsHarvested = 0;
            BerriesHarvested = FishGutted = ClothCollected = LeatherCollected = 0;
            HackedCratesLooted = HeliKills = BradleyKills = MissionsStarted = MissionsCompleted = 0;
            NpcKills = BoatsPurchased = SubPurchased = HelisPurchased = AnimalKills = SupplySignalThrown = 0;
        }
    }
}
