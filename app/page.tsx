"use client";

import React, { useEffect, useState } from "react";
import { db, storage } from "../lib/firebase";
import { collection, getDocs, addDoc, DocumentData, QuerySnapshot } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { toast } from "sonner";
import Image from "next/image";
import "./page.css";

interface Player {
  id: string;
  fullName: string;
  age: number;
  nationality: string;
  club: string;
  goals: number;
  assists: number;
  pfp: string;
}

interface Club {
  id: string;
  name: string;
  logo: string;
  president: string;
  coach: string;
}

interface Trophy {
  id: string;
  name: string;
  image: string;
  winnerId?: string;
  awards: string[];
}

const LoadingSpinner = () => (
  <div className="loading-spinner">
    <div className="lds-ring"><div></div><div></div><div></div><div></div></div>
    <span>Loading...</span>
  </div>
);

const Home: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"players" | "clubs" | "trophies">("players");

  const [players, setPlayers] = useState<Player[]>([]);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [trophies, setTrophies] = useState<Trophy[]>([]);

  const [showAddPlayer, setShowAddPlayer] = useState(false);
  const [newPlayer, setNewPlayer] = useState<Partial<Player>>({});
  const [playerImageFile, setPlayerImageFile] = useState<File | null>(null);

  const [showAddClub, setShowAddClub] = useState(false);
  const [newClub, setNewClub] = useState<Partial<Club>>({});
  const [clubLogoFile, setClubLogoFile] = useState<File | null>(null);

  const [showAddTrophy, setShowAddTrophy] = useState(false);
  const [newTrophy, setNewTrophy] = useState<Partial<Trophy>>({ awards: [] });
  const [trophyImageFile, setTrophyImageFile] = useState<File | null>(null);

  const [loading, setLoading] = useState(false);
  const [loadingAction, setLoadingAction] = useState(false);

  const fetchCollection = async <T,>(collectionName: string, setData: React.Dispatch<React.SetStateAction<T[]>>) => {
    try {
      setLoading(true);
      const snap: QuerySnapshot<DocumentData> = await getDocs(collection(db, collectionName));
      const data: T[] = snap.docs.map(doc => ({ id: doc.id, ...(doc.data() as T) }));
      setData(data);
    } catch (err) {
      toast.error(`Failed to fetch ${collectionName}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCollection<Player>("players", setPlayers);
    fetchCollection<Club>("clubs", setClubs);
    fetchCollection<Trophy>("trophies", setTrophies);
  }, []);

  const uploadImage = async (file: File, path: string): Promise<string> => {
    const storageRef = ref(storage, path);
    await uploadBytes(storageRef, file);
    return await getDownloadURL(storageRef);
  };

  const handleAddPlayer = async () => {
    if (!playerImageFile || !newPlayer.fullName || !newPlayer.club) return toast.error("Missing required fields");
    try {
      setLoadingAction(true);
      const pfpUrl = await uploadImage(playerImageFile, `players/${Date.now()}-${playerImageFile.name}`);
      const docRef = await addDoc(collection(db, "players"), {
        fullName: newPlayer.fullName,
        age: newPlayer.age || 0,
        nationality: newPlayer.nationality || "",
        club: newPlayer.club,
        goals: newPlayer.goals || 0,
        assists: newPlayer.assists || 0,
        pfp: pfpUrl,
      });
      setPlayers([...players, { ...newPlayer, id: docRef.id, pfp: pfpUrl } as Player]);
      setNewPlayer({});
      setPlayerImageFile(null);
      setShowAddPlayer(false);
      toast.success("Player added!");
    } catch {
      toast.error("Failed to add player");
    } finally {
      setLoadingAction(false);
    }
  };

  const handleAddClub = async () => {
    if (!clubLogoFile || !newClub.name || !newClub.president || !newClub.coach) return toast.error("Missing required fields");
    try {
      setLoadingAction(true);
      const logoUrl = await uploadImage(clubLogoFile, `clubs/${Date.now()}-${clubLogoFile.name}`);
      const docRef = await addDoc(collection(db, "clubs"), { ...newClub, logo: logoUrl });
      setClubs([...clubs, { ...newClub, id: docRef.id, logo: logoUrl } as Club]);
      setNewClub({});
      setClubLogoFile(null);
      setShowAddClub(false);
      toast.success("Club added!");
    } catch {
      toast.error("Failed to add club");
    } finally {
      setLoadingAction(false);
    }
  };

  const handleAddTrophy = async () => {
    if (!trophyImageFile || !newTrophy.name) return toast.error("Missing required fields");
    try {
      setLoadingAction(true);
      const imgUrl = await uploadImage(trophyImageFile, `trophies/${Date.now()}-${trophyImageFile.name}`);
      const docRef = await addDoc(collection(db, "trophies"), {
        ...newTrophy,
        image: imgUrl,
        ...(newTrophy.winnerId ? { winnerId: newTrophy.winnerId } : {}),
        awards: newTrophy.awards || [],
      });
      setTrophies([...trophies, { ...newTrophy, id: docRef.id, image: imgUrl } as Trophy]);
      setNewTrophy({ awards: [] });
      setTrophyImageFile(null);
      setShowAddTrophy(false);
      toast.success("Trophy added!");
    } catch {
      toast.error("Failed to add trophy");
    } finally {
      setLoadingAction(false);
    }
  };

  return (
    <div className="container">
      {/* Tabs */}
      <div className="tabs fade-in">
        {["players", "clubs", "trophies"].map(tab => (
          <div
            key={tab}
            className={`tab ${activeTab === tab ? "active bounce" : ""}`}
            onClick={() => setActiveTab(tab as "players" | "clubs" | "trophies")}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </div>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === "players" && (
        <TabList
          items={players}
          renderItem={(p: Player, idx) => (
            <Card key={p.id} idx={idx}>
              <Image src={p.pfp} alt={p.fullName} width={64} height={64} style={{ borderRadius: "50%", objectFit: "cover" }} unoptimized />
              <div className="card-info">
                <div>{p.fullName}</div>
                <div>{p.age} yrs | {p.nationality} | {p.club}</div>
                <div>Goals: {p.goals} | Assists: {p.assists}</div>
              </div>
            </Card>
          )}
          showAdd={showAddPlayer}
          setShowAdd={setShowAddPlayer}
          renderAddForm={() => (
            <AddPlayerForm
              clubs={clubs}
              newPlayer={newPlayer}
              setNewPlayer={setNewPlayer}
              playerImageFile={playerImageFile}
              setPlayerImageFile={setPlayerImageFile}
              handleAdd={handleAddPlayer}
              loadingAction={loadingAction}
            />
          )}
        />
      )}

      {activeTab === "clubs" && (
        <TabList
          items={clubs}
          renderItem={(c: Club, idx) => (
            <Card key={c.id} idx={idx}>
              <Image src={c.logo} alt={c.name} width={64} height={64} style={{ borderRadius: "50%", objectFit: "cover" }} unoptimized />
              <div className="card-info">
                <div>{c.name}</div>
                <div>President: {c.president} | Coach: {c.coach}</div>
              </div>
            </Card>
          )}
          showAdd={showAddClub}
          setShowAdd={setShowAddClub}
          renderAddForm={() => (
            <AddClubForm
              newClub={newClub}
              setNewClub={setNewClub}
              clubLogoFile={clubLogoFile}
              setClubLogoFile={setClubLogoFile}
              handleAdd={handleAddClub}
              loadingAction={loadingAction}
            />
          )}
        />
      )}

      {activeTab === "trophies" && (
        <TabList
          items={trophies}
          renderItem={(t: Trophy, idx) => (
            <Card key={t.id} idx={idx}>
              <Image src={t.image} alt={t.name} width={64} height={64} style={{ borderRadius: "50%", objectFit: "cover" }} unoptimized />
              <div className="card-info">
                <div>{t.name}</div>
                <div>Winner: {t.winnerId ? (clubs.find(c => c.id === t.winnerId)?.name || "Unknown") : "None"}</div>
                <div>Awards: {t.awards?.join(", ") || "None"}</div>
              </div>
            </Card>
          )}
          showAdd={showAddTrophy}
          setShowAdd={setShowAddTrophy}
          renderAddForm={() => (
            <AddTrophyForm
              clubs={clubs}
              newTrophy={newTrophy}
              setNewTrophy={setNewTrophy}
              trophyImageFile={trophyImageFile}
              setTrophyImageFile={setTrophyImageFile}
              handleAdd={handleAddTrophy}
              loadingAction={loadingAction}
            />
          )}
        />
      )}

      {loading && <LoadingSpinner />}
    </div>
  );
};

// Reusable components
const Card: React.FC<{ idx: number; children: React.ReactNode }> = ({ idx, children }) => (
  <div className="card slide-in" style={{ animationDelay: `${idx * 60}ms` }}>{children}</div>
);

const TabList = <T,>({
  items,
  renderItem,
  showAdd,
  setShowAdd,
  renderAddForm,
}: {
  items: T[];
  renderItem: (item: T, idx: number) => React.ReactNode;
  showAdd: boolean;
  setShowAdd: React.Dispatch<React.SetStateAction<boolean>>;
  renderAddForm: () => React.ReactNode;
}) => (
  <div className="fade-in">
    <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 8 }}>
      <i className="fa-solid fa-plus cursor-pointer pulse" onClick={() => setShowAdd(true)}></i>
    </div>
    {items.length === 0 ? (
      <div className="no-data">
        <i className="fa-regular fa-face-sad-tear"></i>
        <p>No data added yet.</p>
      </div>
    ) : (
      <div className="list">{items.map(renderItem)}</div>
    )}
    {showAdd && <div className="popup-overlay fade-in">{renderAddForm()}</div>}
  </div>
);

// Individual Add Forms (simplified)
const AddPlayerForm = ({ clubs, newPlayer, setNewPlayer, playerImageFile, setPlayerImageFile, handleAdd, loadingAction }: any) => (
  <div className="popup popup-animate">
    <i className="fa-solid fa-x close" onClick={() => setNewPlayer({})}></i>
    <h2>Add Player</h2>
    <input type="file" accept="image/*" onChange={e => e.target.files && setPlayerImageFile(e.target.files[0])} />
    <input type="text" placeholder="Full Name" onChange={e => setNewPlayer({ ...newPlayer, fullName: e.target.value })} />
    <input type="number" placeholder="Age" onChange={e => setNewPlayer({ ...newPlayer, age: e.target.valueAsNumber })} />
    <input type="text" placeholder="Nationality" onChange={e => setNewPlayer({ ...newPlayer, nationality: e.target.value })} />
    <select onChange={e => setNewPlayer({ ...newPlayer, club: e.target.value })}>
      <option value="">Select Club</option>
      {clubs.map((c: Club) => <option key={c.id} value={c.name}>{c.name}</option>)}
    </select>
    <input type="number" placeholder="Goals" onChange={e => setNewPlayer({ ...newPlayer, goals: e.target.valueAsNumber })} />
    <input type="number" placeholder="Assists" onChange={e => setNewPlayer({ ...newPlayer, assists: e.target.valueAsNumber })} />
    <button onClick={handleAdd} disabled={loadingAction}>{loadingAction ? "Adding..." : "Add Player"}</button>
  </div>
);

const AddClubForm = ({ newClub, setNewClub, clubLogoFile, setClubLogoFile, handleAdd, loadingAction }: any) => (
  <div className="popup popup-animate">
    <i className="fa-solid fa-x close" onClick={() => setNewClub({})}></i>
    <h2>Add Club</h2>
    <input type="file" accept="image/*" onChange={e => e.target.files && setClubLogoFile(e.target.files[0])} />
    <input type="text" placeholder="Club Name" onChange={e => setNewClub({ ...newClub, name: e.target.value })} />
    <input type="text" placeholder="President Name" onChange={e => setNewClub({ ...newClub, president: e.target.value })} />
    <input type="text" placeholder="Coach Name" onChange={e => setNewClub({ ...newClub, coach: e.target.value })} />
    <button onClick={handleAdd} disabled={loadingAction}>{loadingAction ? "Adding..." : "Add Club"}</button>
  </div>
);

const AddTrophyForm = ({ clubs, newTrophy, setNewTrophy, trophyImageFile, setTrophyImageFile, handleAdd, loadingAction }: any) => (
  <div className="popup popup-animate">
    <i className="fa-solid fa-x close" onClick={() => setNewTrophy({ awards: [] })}></i>
    <h2>Add Trophy</h2>
    <input type="file" accept="image/*" onChange={e => e.target.files && setTrophyImageFile(e.target.files[0])} />
    <input type="text" placeholder="Trophy Name" onChange={e => setNewTrophy({ ...newTrophy, name: e.target.value })} />
    <select value={newTrophy.winnerId || ""} onChange={e => setNewTrophy({ ...newTrophy, winnerId: e.target.value || undefined })}>
      <option value="">Select Winning Club (optional)</option>
      {clubs.map((c: Club) => <option key={c.id} value={c.id}>{c.name}</option>)}
    </select>
    {["Golden Boot", "MVP", "Best Defender", "Best Midfielder", "Best Goalkeeper"].map(award => (
      <label key={award} style={{ display: "block" }}>
        <input
          type="checkbox"
          checked={newTrophy.awards?.includes(award) || false}
          onChange={e => {
            const awards = Array.isArray(newTrophy.awards) ? [...newTrophy.awards] : [];
            if (e.target.checked) awards.push(award);
            else awards.splice(awards.indexOf(award), 1);
            setNewTrophy({ ...newTrophy, awards });
          }}
        /> {award}
      </label>
    ))}
    <button onClick={handleAdd} disabled={loadingAction}>{loadingAction ? "Adding..." : "Add Trophy"}</button>
  </div>
);

export default Home;
