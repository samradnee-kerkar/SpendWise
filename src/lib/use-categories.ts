import {
  collection,
  doc,
  onSnapshot,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { useEffect, useState } from "react";

import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/use-auth";

type CategoryType = "expense" | "income";

type SavedCategory = {
  name: string;
  type: CategoryType;
};

export function useCustomCategories() {
  const { user } = useAuth();
  const [items, setItems] = useState<SavedCategory[]>([]);

  // Listen to the user's saved custom categories
  useEffect(() => {
    if (!user) {
      setItems([]);
      return;
    }
    const unsubscribe = onSnapshot(
      collection(db, "users", user.uid, "categories"),
      (snapshot) => {
        const list: SavedCategory[] = [];
        snapshot.docs.forEach((d) => {
          const data = d.data();
          const name = String(data.name ?? "").trim();
          if (!name) return;
          // Older categories have no type, so they count as expense
          list.push({
            name,
            type: data.type === "income" ? "income" : "expense",
          });
        });
        setItems(list);
      },
      (err) => {
        console.log("Could not load categories:", err);
      },
    );
    return unsubscribe;
  }, [user]);

  const custom = items
    .filter((i) => i.type === "expense")
    .map((i) => i.name)
    .sort((a, b) => a.localeCompare(b));

  const customIncome = items
    .filter((i) => i.type === "income")
    .map((i) => i.name)
    .sort((a, b) => a.localeCompare(b));

  // Saves a new category. "existing" = all names already on screen.
  // Returns { name } if it worked, or { error } if something is wrong.
  async function addCategory(
    rawName: string,
    existing: string[],
    type: CategoryType = "expense",
  ): Promise<{ name?: string; error?: string }> {
    if (!user) return { error: "Please log in first." };

    const name = rawName.trim().replace(/\s+/g, " ");
    if (name.length < 2) {
      return { error: "Category name must be at least 2 letters." };
    }
    if (name.length > 20) {
      return { error: "Category name can be at most 20 letters." };
    }

    // If it already exists, just use the existing one
    const match = existing.find((c) => c.toLowerCase() === name.toLowerCase());
    if (match) return { name: match };

    try {
      const id = type + "-" + name.toLowerCase().replace(/[\/\\]/g, "-");
      await setDoc(doc(db, "users", user.uid, "categories", id), {
        name,
        type,
        createdAt: serverTimestamp(),
      });
      return { name };
    } catch (err) {
      console.log("Could not save category:", err);
      return { error: "Could not save the category. Please try again." };
    }
  }

  return { custom, customIncome, addCategory };
}
