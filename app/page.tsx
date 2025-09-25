"use client";

import React, { useEffect, useState } from "react";
import { db, storage } from "../lib/firebase";
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  DocumentData,
  QuerySnapshot,
} from "firebase/firestore";
import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
} from "firebase/storage";
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
  awardWinners?: { [award: string]: string }; // award: playerId
}

const LoadingSpinner = () => (
  <div className="loading-spinner">
    <div className="lds-ring">
      <div></div>
      <div></div>
      <div></div>
      <div></div>
    </div>
    <span>Loading...</span>
  </div>
);

const AWARD_OPTIONS = [
  "Golden Boot",
  "MVP",
  "Best Defender",
  "Best Midfielder",
  "Best Goalkeeper",
];

const Home: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"players" | "clubs" | "trophies">(
    "players"
  );

  const [players, setPlayers] = useState<Player[]>([]);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [trophies, setTrophies] = useState<Trophy[]>([]);

  // Add/Edit states
  const [showAddPlayer, setShowAddPlayer] = useState(false);
  const [editPlayer, setEditPlayer] = useState<Player | null>(null);
  const [newPlayer, setNewPlayer] = useState<Partial<Player>>({});
  const [playerImageFile, setPlayerImageFile] = useState<File | null>(null);

  const [showAddClub, setShowAddClub] = useState(false);
  const [editClub, setEditClub] = useState<Club | null>(null);
  const [newClub, setNewClub] = useState<Partial<Club>>({});
  const [clubLogoFile, setClubLogoFile] = useState<File | null>(null);

  const [showAddTrophy, setShowAddTrophy] = useState(false);
  const [editTrophy, setEditTrophy] = useState<Trophy | null>(null);
  const [newTrophy, setNewTrophy] = useState<Partial<Trophy>>({ awards: [], awardWinners: {} });
  const [trophyImageFile, setTrophyImageFile] = useState<File | null>(null);

  const [loading, setLoading] = useState(false);
  const [loadingAction, setLoadingAction] = useState(false);

  // Progress states for uploads
  const [playerUploadProgress, setPlayerUploadProgress] = useState<number>(0);
  const [clubUploadProgress, setClubUploadProgress] = useState<number>(0);
  const [trophyUploadProgress, setTrophyUploadProgress] = useState<number>(0);

  // Fetch collections
  const fetchCollection = async <T,>(
    collectionName: string,
    setData: React.Dispatch<React.SetStateAction<T[]>>
  ) => {
    try {
      setLoading(true);
      const snap: QuerySnapshot<DocumentData> = await getDocs(
        collection(db, collectionName)
      );
      const data: T[] = snap.docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() as T),
      }));
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

  // Upload with progress
  const uploadImage = async (
    file: File,
    path: string,
    setProgress: (n: number) => void
  ): Promise<string> => {
    return new Promise((resolve, reject) => {
      const storageRef = ref(storage, path);
      const uploadTask = uploadBytesResumable(storageRef, file);

      uploadTask.on(
        "state_changed",
        (snapshot) => {
          const progress = Math.round(
            (snapshot.bytesTransferred / snapshot.totalBytes) * 100
          );
          setProgress(progress);
        },
        (error) => {
          setProgress(0);
          toast.error(`Upload error: ${error?.message || error}`);
          reject(error);
        },
        async () => {
          setProgress(100);
          const url = await getDownloadURL(uploadTask.snapshot.ref);
          resolve(url);
        }
      );
    });
  };

  // --------- PLAYER CRUD ---------
  const handleAddPlayer = async () => {
    if (!playerImageFile || !newPlayer.fullName || !newPlayer.club) {
      toast.error("Please fill all required fields and select an image.");
      return;
    }
    try {
      setLoadingAction(true);
      setPlayerUploadProgress(0);
      const pfpUrl = await uploadImage(
        playerImageFile,
        `players/${Date.now()}-${playerImageFile.name}`,
        setPlayerUploadProgress
      );
      const docRef = await addDoc(collection(db, "players"), {
        fullName: newPlayer.fullName,
        age: newPlayer.age || 0,
        nationality: newPlayer.nationality || "",
        club: newPlayer.club,
        goals: newPlayer.goals || 0,
        assists: newPlayer.assists || 0,
        pfp: pfpUrl,
      });
      setPlayers([
        ...players,
        { ...newPlayer, id: docRef.id, pfp: pfpUrl } as Player,
      ]);
      setNewPlayer({});
      setPlayerImageFile(null);
      setShowAddPlayer(false);
      toast.success("Player added!");
    } catch {
      toast.error("Failed to add player");
    } finally {
      setLoadingAction(false);
      setPlayerUploadProgress(0);
    }
  };

  const handleEditPlayer = async () => {
    if (!editPlayer) return;
    if (!editPlayer.fullName || !editPlayer.club) {
      toast.error("Please fill all required fields.");
      return;
    }
    try {
      setLoadingAction(true);
      let pfpUrl = editPlayer.pfp;
      if (playerImageFile) {
        setPlayerUploadProgress(0);
        pfpUrl = await uploadImage(
          playerImageFile,
          `players/${Date.now()}-${playerImageFile.name}`,
          setPlayerUploadProgress
        );
      }
      await updateDoc(doc(db, "players", editPlayer.id), {
        fullName: editPlayer.fullName,
        goals: editPlayer.goals,
        assists: editPlayer.assists,
        pfp: pfpUrl,
      });
      setPlayers((prev) =>
        prev.map((p) =>
          p.id === editPlayer.id
            ? { ...p, ...editPlayer, pfp: pfpUrl }
            : p
        )
      );
      setEditPlayer(null);
      setPlayerImageFile(null);
      toast.success("Player updated!");
    } catch {
      toast.error("Failed to update player");
    } finally {
      setLoadingAction(false);
      setPlayerUploadProgress(0);
    }
  };

  const handleDeletePlayer = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this player?")) return;
    try {
      await deleteDoc(doc(db, "players", id));
      setPlayers((prev) => prev.filter((p) => p.id !== id));
      toast.success("Player deleted!");
    } catch {
      toast.error("Failed to delete player");
    }
  };

  // --------- CLUB CRUD ---------
  const handleAddClub = async () => {
    if (!clubLogoFile || !newClub.name || !newClub.president || !newClub.coach) {
      toast.error("Please fill all required fields and select a logo.");
      return;
    }
    try {
      setLoadingAction(true);
      setClubUploadProgress(0);
      const logoUrl = await uploadImage(
        clubLogoFile,
        `clubs/${Date.now()}-${clubLogoFile.name}`,
        setClubUploadProgress
      );
      const docRef = await addDoc(collection(db, "clubs"), {
        ...newClub,
        logo: logoUrl,
      });
      setClubs([
        ...clubs,
        { ...newClub, id: docRef.id, logo: logoUrl } as Club,
      ]);
      setNewClub({});
      setClubLogoFile(null);
      setShowAddClub(false);
      toast.success("Club added!");
    } catch {
      toast.error("Failed to add club");
    } finally {
      setLoadingAction(false);
      setClubUploadProgress(0);
    }
  };

  const handleEditClub = async () => {
    if (!editClub) return;
    if (!editClub.name || !editClub.president || !editClub.coach) {
      toast.error("Please fill all required fields.");
      return;
    }
    try {
      setLoadingAction(true);
      let logoUrl = editClub.logo;
      if (clubLogoFile) {
        setClubUploadProgress(0);
        logoUrl = await uploadImage(
          clubLogoFile,
          `clubs/${Date.now()}-${clubLogoFile.name}`,
          setClubUploadProgress
        );
      }
      await updateDoc(doc(db, "clubs", editClub.id), {
        name: editClub.name,
        president: editClub.president,
        coach: editClub.coach,
        logo: logoUrl,
      });
      setClubs((prev) =>
        prev.map((c) =>
          c.id === editClub.id
            ? { ...c, ...editClub, logo: logoUrl }
            : c
        )
      );
      setEditClub(null);
      setClubLogoFile(null);
      toast.success("Club updated!");
    } catch {
      toast.error("Failed to update club");
    } finally {
      setLoadingAction(false);
      setClubUploadProgress(0);
    }
  };

  const handleDeleteClub = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this club?")) return;
    try {
      await deleteDoc(doc(db, "clubs", id));
      setClubs((prev) => prev.filter((c) => c.id !== id));
      toast.success("Club deleted!");
    } catch {
      toast.error("Failed to delete club");
    }
  };

  // --------- TROPHY CRUD ---------
  const handleAddTrophy = async () => {
    if (!trophyImageFile || !newTrophy.name) {
      toast.error("Please fill all required fields and select an image.");
      return;
    }
    try {
      setLoadingAction(true);
      setTrophyUploadProgress(0);
      const imgUrl = await uploadImage(
        trophyImageFile,
        `trophies/${Date.now()}-${trophyImageFile.name}`,
        setTrophyUploadProgress
      );
      const docRef = await addDoc(collection(db, "trophies"), {
        ...newTrophy,
        image: imgUrl,
        ...(newTrophy.winnerId ? { winnerId: newTrophy.winnerId } : {}),
        awards: newTrophy.awards || [],
        awardWinners: newTrophy.awardWinners || {},
      });
      setTrophies([
        ...trophies,
        {
          ...newTrophy,
          id: docRef.id,
          image: imgUrl,
        } as Trophy,
      ]);
      setNewTrophy({ awards: [], awardWinners: {} });
      setTrophyImageFile(null);
      setShowAddTrophy(false);
      toast.success("Trophy added!");
    } catch {
      toast.error("Failed to add trophy");
    } finally {
      setLoadingAction(false);
      setTrophyUploadProgress(0);
    }
  };

  const handleEditTrophy = async () => {
    if (!editTrophy) return;
    if (!editTrophy.name) {
      toast.error("Please fill all required fields.");
      return;
    }
    try {
      setLoadingAction(true);
      let imgUrl = editTrophy.image;
      if (trophyImageFile) {
        setTrophyUploadProgress(0);
        imgUrl = await uploadImage(
          trophyImageFile,
          `trophies/${Date.now()}-${trophyImageFile.name}`,
          setTrophyUploadProgress
        );
      }
      await updateDoc(doc(db, "trophies", editTrophy.id), {
        name: editTrophy.name,
        image: imgUrl,
        winnerId: editTrophy.winnerId || null,
        awards: editTrophy.awards || [],
        awardWinners: editTrophy.awardWinners || {},
      });
      setTrophies((prev) =>
        prev.map((t) =>
          t.id === editTrophy.id
            ? { ...t, ...editTrophy, image: imgUrl }
            : t
        )
      );
      setEditTrophy(null);
      setTrophyImageFile(null);
      toast.success("Trophy updated!");
    } catch {
      toast.error("Failed to update trophy");
    } finally {
      setLoadingAction(false);
      setTrophyUploadProgress(0);
    }
  };

  const handleDeleteTrophy = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this trophy?")) return;
    try {
      await deleteDoc(doc(db, "trophies", id));
      setTrophies((prev) => prev.filter((t) => t.id !== id));
      toast.success("Trophy deleted!");
    } catch {
      toast.error("Failed to delete trophy");
    }
  };

  // --------- RENDER ---------
  return (
    <div className="container">
      <div className="tabs fade-in">
        {["players", "clubs", "trophies"].map((tab) => (
          <div
            key={tab}
            className={`tab ${activeTab === tab ? "active bounce" : ""}`}
            onClick={() =>
              setActiveTab(tab as "players" | "clubs" | "trophies")
            }
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </div>
        ))}
      </div>

      {/* PLAYERS */}
      {activeTab === "players" && (
        <div className="fade-in">
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 8 }}>
            <i
              className="fa-solid fa-plus cursor-pointer pulse"
              onClick={() => {
                setShowAddPlayer(true);
                setNewPlayer({});
                setPlayerImageFile(null);
              }}
            ></i>
          </div>
          {players.length === 0 ? (
            <div className="no-data">
              <i className="fa-regular fa-face-sad-tear"></i>
              <p>No players added yet.</p>
            </div>
          ) : (
            <div className="list">
              {players.map((p, idx) => (
                <div
                  key={p.id}
                  className="card slide-in"
                  style={{
                    animationDelay: `${idx * 60}ms`,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 16, flex: 1 }}>
                    <Image
                      src={p.pfp}
                      alt={p.fullName}
                      width={64}
                      height={64}
                      style={{
                        borderRadius: "50%",
                        objectFit: "cover",
                        border: "2px solid #0070f3",
                      }}
                      unoptimized
                    />
                    <div className="card-info" style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600 }}>{p.fullName}</div>
                      <div style={{ fontSize: 13, color: "#555" }}>
                        {p.age} yrs | {p.nationality} | {p.club}
                      </div>
                      <div style={{ fontSize: 13 }}>
                        Goals: {p.goals} | Assists: {p.assists}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <i
                      className="fa-solid fa-pen-to-square cursor-pointer"
                      title="Edit"
                      style={{ color: "#0070f3" }}
                      onClick={() => {
                        setEditPlayer(p);
                        setPlayerImageFile(null);
                      }}
                    ></i>
                    <i
                      className="fa-solid fa-trash cursor-pointer"
                      title="Delete"
                      style={{ color: "#e00" }}
                      onClick={() => handleDeletePlayer(p.id)}
                    ></i>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Add Player Popup */}
          {showAddPlayer && (
            <div className="popup-overlay fade-in">
              <AddPlayerForm
                clubs={clubs}
                newPlayer={newPlayer}
                setNewPlayer={setNewPlayer}
                playerImageFile={playerImageFile}
                setPlayerImageFile={setPlayerImageFile}
                handleAdd={handleAddPlayer}
                setShowAdd={setShowAddPlayer}
                loadingAction={loadingAction}
                uploadProgress={playerUploadProgress}
              />
            </div>
          )}

          {/* Edit Player Popup */}
          {editPlayer && (
            <div className="popup-overlay fade-in">
              <EditPlayerForm
                player={editPlayer}
                setPlayer={setEditPlayer}
                playerImageFile={playerImageFile}
                setPlayerImageFile={setPlayerImageFile}
                handleEdit={handleEditPlayer}
                setShowEdit={setEditPlayer}
                loadingAction={loadingAction}
                uploadProgress={playerUploadProgress}
              />
            </div>
          )}
        </div>
      )}

      {/* CLUBS */}
      {activeTab === "clubs" && (
        <div className="fade-in">
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 8 }}>
            <i
              className="fa-solid fa-plus cursor-pointer pulse"
              onClick={() => {
                setShowAddClub(true);
                setNewClub({});
                setClubLogoFile(null);
              }}
            ></i>
          </div>
          {clubs.length === 0 ? (
            <div className="no-data">
              <i className="fa-regular fa-face-sad-tear"></i>
              <p>No clubs added yet.</p>
            </div>
          ) : (
            <div className="list">
              {clubs.map((c, idx) => (
                <div key={c.id} className="card slide-in" style={{ animationDelay: `${idx * 60}ms` }}>
                  <Image
                    src={c.logo}
                    alt={c.name}
                    width={64}
                    height={64}
                    style={{ borderRadius: "50%", objectFit: "cover" }}
                    unoptimized
                  />
                  <div className="card-info" style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600 }}>{c.name}</div>
                    <div style={{ fontSize: 13, color: "#555" }}>
                      President: {c.president} | Coach: {c.coach}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <i
                      className="fa-solid fa-pen-to-square cursor-pointer"
                      title="Edit"
                      style={{ color: "#0070f3" }}
                      onClick={() => {
                        setEditClub(c);
                        setClubLogoFile(null);
                      }}
                    ></i>
                    <i
                      className="fa-solid fa-trash cursor-pointer"
                      title="Delete"
                      style={{ color: "#e00" }}
                      onClick={() => handleDeleteClub(c.id)}
                    ></i>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Add Club Popup */}
          {showAddClub && (
            <div className="popup-overlay fade-in">
              <AddClubForm
                newClub={newClub}
                setNewClub={setNewClub}
                clubLogoFile={clubLogoFile}
                setClubLogoFile={setClubLogoFile}
                handleAdd={handleAddClub}
                setShowAdd={setShowAddClub}
                loadingAction={loadingAction}
                uploadProgress={clubUploadProgress}
              />
            </div>
          )}

          {/* Edit Club Popup */}
          {editClub && (
            <div className="popup-overlay fade-in">
              <EditClubForm
                club={editClub}
                setClub={setEditClub}
                clubLogoFile={clubLogoFile}
                setClubLogoFile={setClubLogoFile}
                handleEdit={handleEditClub}
                setShowEdit={setEditClub}
                loadingAction={loadingAction}
                uploadProgress={clubUploadProgress}
              />
            </div>
          )}
        </div>
      )}

      {/* TROPHIES */}
      {activeTab === "trophies" && (
        <div className="fade-in">
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 8 }}>
            <i
              className="fa-solid fa-plus cursor-pointer pulse"
              onClick={() => {
                setShowAddTrophy(true);
                setNewTrophy({ awards: [], awardWinners: {} });
                setTrophyImageFile(null);
              }}
            ></i>
          </div>
          {trophies.length === 0 ? (
            <div className="no-data">
              <i className="fa-regular fa-face-sad-tear"></i>
              <p>No trophies added yet.</p>
            </div>
          ) : (
            <div className="list">
              {trophies.map((t, idx) => (
                <div key={t.id} className="card slide-in" style={{ animationDelay: `${idx * 60}ms` }}>
                  <Image
                    src={t.image}
                    alt={t.name}
                    width={64}
                    height={64}
                    style={{ borderRadius: "50%", objectFit: "cover" }}
                    unoptimized
                  />
                  <div className="card-info" style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600 }}>{t.name}</div>
                    <div style={{ fontSize: 13, color: "#555" }}>
                      Winner: {t.winnerId ? clubs.find((c) => c.id === t.winnerId)?.name || "Unknown" : "None"}
                    </div>
                    <div style={{ fontSize: 13 }}>
                      Awards:{" "}
                      {t.awards?.length
                        ? t.awards
                            .map(
                              (award) =>
                                `${award}${
                                  t.awardWinners && t.awardWinners[award]
                                    ? ` (${players.find((p) => p.id === t.awardWinners![award])?.fullName || "Unknown"})`
                                    : ""
                                }`
                            )
                            .join(", ")
                        : "None"}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <i
                      className="fa-solid fa-pen-to-square cursor-pointer"
                      title="Edit"
                      style={{ color: "#0070f3" }}
                      onClick={() => {
                        setEditTrophy(t);
                        setTrophyImageFile(null);
                      }}
                    ></i>
                    <i
                      className="fa-solid fa-trash cursor-pointer"
                      title="Delete"
                      style={{ color: "#e00" }}
                      onClick={() => handleDeleteTrophy(t.id)}
                    ></i>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Add Trophy Popup */}
          {showAddTrophy && (
            <div className="popup-overlay fade-in">
              <AddTrophyForm
                clubs={clubs}
                players={players}
                newTrophy={newTrophy}
                setNewTrophy={setNewTrophy}
                trophyImageFile={trophyImageFile}
                setTrophyImageFile={setTrophyImageFile}
                handleAdd={handleAddTrophy}
                setShowAdd={setShowAddTrophy}
                loadingAction={loadingAction}
                uploadProgress={trophyUploadProgress}
              />
            </div>
          )}

          {/* Edit Trophy Popup */}
          {editTrophy && (
            <div className="popup-overlay fade-in">
              <EditTrophyForm
                clubs={clubs}
                players={players}
                trophy={editTrophy}
                setTrophy={setEditTrophy}
                trophyImageFile={trophyImageFile}
                setTrophyImageFile={setTrophyImageFile}
                handleEdit={handleEditTrophy}
                setShowEdit={setEditTrophy}
                loadingAction={loadingAction}
                uploadProgress={trophyUploadProgress}
              />
            </div>
          )}
        </div>
      )}

      {loading && <LoadingSpinner />}
    </div>
  );
};

// --------- PLAYER FORMS ---------
interface AddPlayerProps {
  clubs: Club[];
  newPlayer: Partial<Player>;
  setNewPlayer: React.Dispatch<React.SetStateAction<Partial<Player>>>;
  playerImageFile: File | null;
  setPlayerImageFile: React.Dispatch<React.SetStateAction<File | null>>;
  handleAdd: () => void;
  setShowAdd: React.Dispatch<React.SetStateAction<boolean>>;
  loadingAction: boolean;
  uploadProgress: number;
}
const AddPlayerForm: React.FC<AddPlayerProps> = ({
  clubs,
  newPlayer,
  setNewPlayer,
  playerImageFile,
  setPlayerImageFile,
  handleAdd,
  setShowAdd,
  loadingAction,
  uploadProgress,
}) => (
  <div className="popup popup-animate">
    <i className="fa-solid fa-x close" onClick={() => setShowAdd(false)}></i>
    <h2>Add Player</h2>
    <input
      type="file"
      accept="image/*"
      onChange={(e) =>
        e.target.files && setPlayerImageFile(e.target.files[0])
      }
    />
    <input
      type="text"
      placeholder="Full Name"
      value={newPlayer.fullName || ""}
      onChange={(e) =>
        setNewPlayer({ ...newPlayer, fullName: e.target.value })
      }
    />
    <input
      type="number"
      placeholder="Age"
      value={newPlayer.age || ""}
      onChange={(e) =>
        setNewPlayer({ ...newPlayer, age: e.target.valueAsNumber })
      }
    />
    <input
      type="text"
      placeholder="Nationality"
      value={newPlayer.nationality || ""}
      onChange={(e) =>
        setNewPlayer({ ...newPlayer, nationality: e.target.value })
      }
    />
    <select
      value={newPlayer.club || ""}
      onChange={(e) => setNewPlayer({ ...newPlayer, club: e.target.value })}
    >
      <option value="">Select Club</option>
      {clubs.map((c) => (
        <option key={c.id} value={c.name}>
          {c.name}
        </option>
      ))}
    </select>
    <input
      type="number"
      placeholder="Goals"
      value={newPlayer.goals || ""}
      onChange={(e) =>
        setNewPlayer({ ...newPlayer, goals: e.target.valueAsNumber })
      }
    />
    <input
      type="number"
      placeholder="Assists"
      value={newPlayer.assists || ""}
      onChange={(e) =>
        setNewPlayer({ ...newPlayer, assists: e.target.valueAsNumber })
      }
    />
    <button onClick={handleAdd} disabled={loadingAction}>
      {loadingAction ? `Uploading... ${uploadProgress}%` : "Add Player"}
    </button>
  </div>
);

interface EditPlayerProps {
  player: Player;
  setPlayer: React.Dispatch<React.SetStateAction<Player | null>>;
  playerImageFile: File | null;
  setPlayerImageFile: React.Dispatch<React.SetStateAction<File | null>>;
  handleEdit: () => void;
  setShowEdit: React.Dispatch<React.SetStateAction<Player | null>>;
  loadingAction: boolean;
  uploadProgress: number;
}
const EditPlayerForm: React.FC<EditPlayerProps> = ({
  player,
  setPlayer,
  playerImageFile,
  setPlayerImageFile,
  handleEdit,
  setShowEdit,
  loadingAction,
  uploadProgress,
}) => (
  <div className="popup popup-animate">
    <i className="fa-solid fa-x close" onClick={() => setShowEdit(null)}></i>
    <h2>Edit Player</h2>
    <input
      type="file"
      accept="image/*"
      onChange={(e) =>
        e.target.files && setPlayerImageFile(e.target.files[0])
      }
    />
    <input
      type="text"
      placeholder="Full Name"
      value={player.fullName}
      onChange={(e) =>
        setPlayer({ ...player, fullName: e.target.value })
      }
    />
    <input
      type="number"
      placeholder="Goals"
      value={player.goals}
      onChange={(e) =>
        setPlayer({ ...player, goals: e.target.valueAsNumber })
      }
    />
    <input
      type="number"
      placeholder="Assists"
      value={player.assists}
      onChange={(e) =>
        setPlayer({ ...player, assists: e.target.valueAsNumber })
      }
    />
    <button onClick={handleEdit} disabled={loadingAction}>
      {loadingAction ? `Uploading... ${uploadProgress}%` : "Save Changes"}
    </button>
  </div>
);

// --------- CLUB FORMS ---------
interface AddClubProps {
  newClub: Partial<Club>;
  setNewClub: React.Dispatch<React.SetStateAction<Partial<Club>>>;
  clubLogoFile: File | null;
  setClubLogoFile: React.Dispatch<React.SetStateAction<File | null>>;
  handleAdd: () => void;
  setShowAdd: React.Dispatch<React.SetStateAction<boolean>>;
  loadingAction: boolean;
  uploadProgress: number;
}
const AddClubForm: React.FC<AddClubProps> = ({
  newClub,
  setNewClub,
  clubLogoFile,
  setClubLogoFile,
  handleAdd,
  setShowAdd,
  loadingAction,
  uploadProgress,
}) => (
  <div className="popup popup-animate">
    <i className="fa-solid fa-x close" onClick={() => setShowAdd(false)}></i>
    <h2>Add Club</h2>
    <input
      type="file"
      accept="image/*"
      onChange={(e) =>
        e.target.files && setClubLogoFile(e.target.files[0])
      }
    />
    <input
      type="text"
      placeholder="Club Name"
      value={newClub.name || ""}
      onChange={(e) => setNewClub({ ...newClub, name: e.target.value })}
    />
    <input
      type="text"
      placeholder="President Name"
      value={newClub.president || ""}
      onChange={(e) => setNewClub({ ...newClub, president: e.target.value })}
    />
    <input
      type="text"
      placeholder="Coach Name"
      value={newClub.coach || ""}
      onChange={(e) => setNewClub({ ...newClub, coach: e.target.value })}
    />
    <button onClick={handleAdd} disabled={loadingAction}>
      {loadingAction ? `Uploading... ${uploadProgress}%` : "Add Club"}
    </button>
  </div>
);

interface EditClubProps {
  club: Club;
  setClub: React.Dispatch<React.SetStateAction<Club | null>>;
  clubLogoFile: File | null;
  setClubLogoFile: React.Dispatch<React.SetStateAction<File | null>>;
  handleEdit: () => void;
  setShowEdit: React.Dispatch<React.SetStateAction<Club | null>>;
  loadingAction: boolean;
  uploadProgress: number;
}
const EditClubForm: React.FC<EditClubProps> = ({
  club,
  setClub,
  clubLogoFile,
  setClubLogoFile,
  handleEdit,
  setShowEdit,
  loadingAction,
  uploadProgress,
}) => (
  <div className="popup popup-animate">
    <i className="fa-solid fa-x close" onClick={() => setShowEdit(null)}></i>
    <h2>Edit Club</h2>
    <input
      type="file"
      accept="image/*"
      onChange={(e) =>
        e.target.files && setClubLogoFile(e.target.files[0])
      }
    />
    <input
      type="text"
      placeholder="Club Name"
      value={club.name}
      onChange={(e) => setClub({ ...club, name: e.target.value })}
    />
    <input
      type="text"
      placeholder="President Name"
      value={club.president}
      onChange={(e) => setClub({ ...club, president: e.target.value })}
    />
    <input
      type="text"
      placeholder="Coach Name"
      value={club.coach}
      onChange={(e) => setClub({ ...club, coach: e.target.value })}
    />
    <button onClick={handleEdit} disabled={loadingAction}>
      {loadingAction ? `Uploading... ${uploadProgress}%` : "Save Changes"}
    </button>
  </div>
);

// --------- TROPHY FORMS ---------
interface AddTrophyProps {
  clubs: Club[];
  players: Player[];
  newTrophy: Partial<Trophy>;
  setNewTrophy: React.Dispatch<React.SetStateAction<Partial<Trophy>>>;
  trophyImageFile: File | null;
  setTrophyImageFile: React.Dispatch<React.SetStateAction<File | null>>;
  handleAdd: () => void;
  setShowAdd: React.Dispatch<React.SetStateAction<boolean>>;
  loadingAction: boolean;
  uploadProgress: number;
}
const AddTrophyForm: React.FC<AddTrophyProps> = ({
  clubs,
  players,
  newTrophy,
  setNewTrophy,
  trophyImageFile,
  setTrophyImageFile,
  handleAdd,
  setShowAdd,
  loadingAction,
  uploadProgress,
}) => (
  <div className="popup popup-animate">
    <i className="fa-solid fa-x close" onClick={() => setShowAdd(false)}></i>
    <h2>Add Trophy</h2>
    <input
      type="file"
      accept="image/*"
      onChange={(e) =>
        e.target.files && setTrophyImageFile(e.target.files[0])
      }
    />
    <input
      type="text"
      placeholder="Trophy Name"
      value={newTrophy.name || ""}
      onChange={(e) => setNewTrophy({ ...newTrophy, name: e.target.value })}
    />
    <select
      value={newTrophy.winnerId || ""}
      onChange={(e) =>
        setNewTrophy({
          ...newTrophy,
          winnerId: e.target.value || undefined,
        })
      }
    >
      <option value="">Select Winning Club (optional)</option>
      {clubs.map((c) => (
        <option key={c.id} value={c.id}>
          {c.name}
        </option>
      ))}
    </select>
    <div>
      {AWARD_OPTIONS.map((award) => (
        <div key={award} style={{ marginBottom: 4 }}>
          <label>
            <input
              type="checkbox"
              checked={newTrophy.awards?.includes(award) || false}
              onChange={(e) => {
                let awards = Array.isArray(newTrophy.awards)
                  ? [...newTrophy.awards]
                  : [];
                let awardWinners = { ...(newTrophy.awardWinners || {}) };
                if (e.target.checked) {
                  awards.push(award);
                } else {
                  awards = awards.filter((a) => a !== award);
                  delete awardWinners[award];
                }
                setNewTrophy({ ...newTrophy, awards, awardWinners });
              }}
            />{" "}
            {award}
          </label>
          {newTrophy.awards?.includes(award) && (
            <select
              style={{ marginLeft: 8 }}
              value={newTrophy.awardWinners?.[award] || ""}
              onChange={(e) =>
                setNewTrophy({
                  ...newTrophy,
                  awardWinners: {
                    ...(newTrophy.awardWinners || {}),
                    [award]: e.target.value,
                  },
                })
              }
            >
              <option value="">Assign Winner</option>
              {players.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.fullName}
                </option>
              ))}
            </select>
          )}
        </div>
      ))}
    </div>
    <button onClick={handleAdd} disabled={loadingAction}>
      {loadingAction ? `Uploading... ${uploadProgress}%` : "Add Trophy"}
    </button>
  </div>
);

interface EditTrophyProps {
  clubs: Club[];
  players: Player[];
  trophy: Trophy;
  setTrophy: React.Dispatch<React.SetStateAction<Trophy | null>>;
  trophyImageFile: File | null;
  setTrophyImageFile: React.Dispatch<React.SetStateAction<File | null>>;
  handleEdit: () => void;
  setShowEdit: React.Dispatch<React.SetStateAction<Trophy | null>>;
  loadingAction: boolean;
  uploadProgress: number;
}
const EditTrophyForm: React.FC<EditTrophyProps> = ({
  clubs,
  players,
  trophy,
  setTrophy,
  trophyImageFile,
  setTrophyImageFile,
  handleEdit,
  setShowEdit,
  loadingAction,
  uploadProgress,
}) => (
  <div className="popup popup-animate">
    <i className="fa-solid fa-x close" onClick={() => setShowEdit(null)}></i>
    <h2>Edit Trophy</h2>
    <input
      type="file"
      accept="image/*"
      onChange={(e) =>
        e.target.files && setTrophyImageFile(e.target.files[0])
      }
    />
    <input
      type="text"
      placeholder="Trophy Name"
      value={trophy.name}
      onChange={(e) => setTrophy({ ...trophy, name: e.target.value })}
    />
    <select
      value={trophy.winnerId || ""}
      onChange={(e) =>
        setTrophy({
          ...trophy,
          winnerId: e.target.value || undefined,
        })
      }
    >
      <option value="">Select Winning Club (optional)</option>
      {clubs.map((c) => (
        <option key={c.id} value={c.id}>
          {c.name}
        </option>
      ))}
    </select>
    <div>
      {AWARD_OPTIONS.map((award) => (
        <div key={award} style={{ marginBottom: 4 }}>
          <label>
            <input
              type="checkbox"
              checked={trophy.awards?.includes(award) || false}
              onChange={(e) => {
                let awards = Array.isArray(trophy.awards)
                  ? [...trophy.awards]
                  : [];
                let awardWinners = { ...(trophy.awardWinners || {}) };
                if (e.target.checked) {
                  awards.push(award);
                } else {
                  awards = awards.filter((a) => a !== award);
                  delete awardWinners[award];
                }
                setTrophy({ ...trophy, awards, awardWinners });
              }}
            />{" "}
            {award}
          </label>
          {trophy.awards?.includes(award) && (
            <select
              style={{ marginLeft: 8 }}
              value={trophy.awardWinners?.[award] || ""}
              onChange={(e) =>
                setTrophy({
                  ...trophy,
                  awardWinners: {
                    ...(trophy.awardWinners || {}),
                    [award]: e.target.value,
                  },
                })
              }
            >
              <option value="">Assign Winner</option>
              {players.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.fullName}
                </option>
              ))}
            </select>
          )}
        </div>
      ))}
    </div>
    <button onClick={handleEdit} disabled={loadingAction}>
      {loadingAction ? `Uploading... ${uploadProgress}%` : "Save Changes"}
    </button>
  </div>
);

export default Home;
