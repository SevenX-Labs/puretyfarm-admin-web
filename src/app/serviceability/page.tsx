"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  MapPin,
  Building2,
  Navigation,
  Plus,
  Search,
  Pencil,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  X,
  ChevronRight,
  RefreshCw,
  Loader2,
  ShieldCheck,
  AlertCircle,
  Layers,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/api-client";
import { getCachedData, setCachedData } from "@/lib/cache";
import {
  StateItem,
  CityItem,
  AreaItem,
} from "@/types/location";
import {
  getStates,
  createState,
  updateState,
  deleteState,
  getCitiesByState,
  createCity,
  updateCity,
  deleteCity,
  getAreasByCity,
  createArea,
  updateArea,
  deleteArea,
} from "@/services/location-service";

interface ConflictInfo {
  type: "state" | "city" | "area";
  id: string;
  name: string;
  message: string;
}

interface DeleteTarget {
  type: "state" | "city" | "area";
  id: string;
  name: string;
}

export default function ServiceabilityPage() {
  // Data States (initialized consistently for SSR hydration)
  const [states, setStates] = useState<StateItem[]>([]);
  const [cities, setCities] = useState<CityItem[]>([]);
  const [areas, setAreas] = useState<AreaItem[]>([]);

  // Selection States
  const [selectedStateId, setSelectedStateId] = useState<string | null>(null);
  const [selectedCityId, setSelectedCityId] = useState<string | null>(null);

  // Loading States
  const [isLoadingStates, setIsLoadingStates] = useState<boolean>(true);
  const [isLoadingCities, setIsLoadingCities] = useState<boolean>(false);
  const [isLoadingAreas, setIsLoadingAreas] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Search Filter for Areas
  const [areaSearchQuery, setAreaSearchQuery] = useState("");

  // Mobile Active Tab (for screen widths < lg)
  const [mobileTab, setMobileTab] = useState<"states" | "cities" | "areas">("states");

  // Toasts & Notifications
  const [toastMessage, setToastMessage] = useState<{
    text: string;
    type: "success" | "error";
  } | null>(null);

  // Modal States
  const [stateModalOpen, setStateModalOpen] = useState(false);
  const [editingState, setEditingState] = useState<StateItem | null>(null);
  const [stateFormName, setStateFormName] = useState("");
  const [stateFormActive, setStateFormActive] = useState(true);

  const [cityModalOpen, setCityModalOpen] = useState(false);
  const [editingCity, setEditingCity] = useState<CityItem | null>(null);
  const [cityFormName, setCityFormName] = useState("");
  const [cityFormActive, setCityFormActive] = useState(true);

  const [areaModalOpen, setAreaModalOpen] = useState(false);
  const [editingArea, setEditingArea] = useState<AreaItem | null>(null);
  const [areaFormName, setAreaFormName] = useState("");
  const [areaFormPincode, setAreaFormPincode] = useState("");
  const [areaFormActive, setAreaFormActive] = useState(true);

  // Delete & Conflict Modals
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [conflictInfo, setConflictInfo] = useState<ConflictInfo | null>(null);

  // Helper to show toasts
  const notify = useCallback((text: string, type: "success" | "error" = "success") => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage((prev) => (prev?.text === text ? null : prev));
    }, 3500);
  }, []);

  // Selected Objects
  const selectedState = useMemo(
    () => states.find((s) => s.id === selectedStateId) || null,
    [states, selectedStateId]
  );

  const selectedCity = useMemo(
    () => cities.find((c) => c.id === selectedCityId) || null,
    [cities, selectedCityId]
  );

  // -------------------------------------------------------------
  // Fetch States with SWR & Silent Background Revalidation
  // -------------------------------------------------------------
  const fetchAllStates = useCallback(async (forceRefresh = false) => {
    try {
      const data = await getStates({
        forceRefresh,
        onFreshData: (fresh) => {
          setStates(fresh);
          setIsLoadingStates(false);
          if (fresh.length > 0) {
            setSelectedStateId((prev) => {
              if (prev && fresh.some((s) => s.id === prev)) return prev;
              return fresh[0].id;
            });
          }
        },
      });

      setStates(data);
      if (data.length > 0) {
        setSelectedStateId((prev) => {
          if (prev && data.some((s) => s.id === prev)) return prev;
          return data[0].id;
        });
      } else {
        setSelectedStateId(null);
        setCities([]);
        setAreas([]);
      }
    } catch (err) {
      if (states.length === 0) {
        const msg = err instanceof Error ? err.message : "Failed to load states";
        notify(msg, "error");
      }
    } finally {
      setIsLoadingStates(false);
    }
  }, [states.length, notify]);

  // -------------------------------------------------------------
  // Client-Side Mount & Instant SWR Cache Hydration (0ms)
  // -------------------------------------------------------------
  useEffect(() => {
    // 1. Immediately hydrate from localStorage cache on client mount
    const cachedStates = getCachedData<StateItem[]>("locations:states");
    if (cachedStates && cachedStates.length > 0) {
      setStates(cachedStates);
      setIsLoadingStates(false);
      const initialStId = cachedStates[0].id;
      setSelectedStateId(initialStId);

      const cachedCities = getCachedData<CityItem[]>(`locations:cities:${initialStId}`);
      if (cachedCities && cachedCities.length > 0) {
        setCities(cachedCities);
        const initialCtId = cachedCities[0].id;
        setSelectedCityId(initialCtId);

        const cachedAreas = getCachedData<AreaItem[]>(`locations:areas:${initialCtId}`);
        if (cachedAreas) {
          setAreas(cachedAreas);
        }
      }
    }

    // 2. Silently fetch fresh data in background
    fetchAllStates();
  }, [fetchAllStates]);

  // -------------------------------------------------------------
  // Fetch Cities when selectedStateId changes (with SWR)
  // -------------------------------------------------------------
  useEffect(() => {
    if (!selectedStateId) {
      setCities([]);
      setSelectedCityId(null);
      setAreas([]);
      return;
    }

    let isMounted = true;
    const cachedForState = getCachedData<CityItem[]>(`locations:cities:${selectedStateId}`);
    if (cachedForState && cachedForState.length > 0) {
      setCities(cachedForState);
      if (!selectedCityId || !cachedForState.some((c) => c.id === selectedCityId)) {
        setSelectedCityId(cachedForState[0].id);
      }
      setIsLoadingCities(false);
    } else {
      setIsLoadingCities(true);
    }

    const fetchCities = async () => {
      try {
        const data = await getCitiesByState(selectedStateId, {
          onFreshData: (fresh) => {
            if (!isMounted) return;
            setCities(fresh);
            setIsLoadingCities(false);
            if (fresh.length > 0) {
              setSelectedCityId((prev) => {
                if (prev && fresh.some((c) => c.id === prev)) return prev;
                return fresh[0].id;
              });
            }
          },
        });

        if (!isMounted) return;
        setCities(data);
        if (data.length > 0) {
          setSelectedCityId((prev) => {
            if (prev && data.some((c) => c.id === prev)) return prev;
            return data[0].id;
          });
        } else {
          setSelectedCityId(null);
          setAreas([]);
        }
      } catch (err) {
        if (!isMounted) return;
        if (!cachedForState || cachedForState.length === 0) {
          const msg = err instanceof Error ? err.message : "Failed to load cities";
          notify(msg, "error");
        }
      } finally {
        if (isMounted) setIsLoadingCities(false);
      }
    };

    fetchCities();
    return () => {
      isMounted = false;
    };
  }, [selectedStateId, selectedCityId, notify]);

  // -------------------------------------------------------------
  // Fetch Areas when selectedCityId changes (with SWR)
  // -------------------------------------------------------------
  useEffect(() => {
    if (!selectedCityId) {
      setAreas([]);
      return;
    }

    let isMounted = true;
    const cachedForCity = getCachedData<AreaItem[]>(`locations:areas:${selectedCityId}`);
    if (cachedForCity && cachedForCity.length > 0) {
      setAreas(cachedForCity);
      setIsLoadingAreas(false);
    } else {
      setIsLoadingAreas(true);
    }

    const fetchAreas = async () => {
      try {
        const data = await getAreasByCity(selectedCityId, {
          onFreshData: (fresh) => {
            if (!isMounted) return;
            setAreas(fresh);
            setIsLoadingAreas(false);
          },
        });

        if (!isMounted) return;
        setAreas(data);
      } catch (err) {
        if (!isMounted) return;
        if (!cachedForCity || cachedForCity.length === 0) {
          const msg = err instanceof Error ? err.message : "Failed to load areas";
          notify(msg, "error");
        }
      } finally {
        if (isMounted) setIsLoadingAreas(false);
      }
    };

    fetchAreas();
    return () => {
      isMounted = false;
    };
  }, [selectedCityId, notify]);

  // Filtered Areas by Search Query
  const filteredAreas = useMemo(() => {
    const q = areaSearchQuery.trim().toLowerCase();
    if (!q) return areas;
    return areas.filter(
      (a) =>
        a.name.toLowerCase().includes(q) ||
        a.pincode.toLowerCase().includes(q)
    );
  }, [areas, areaSearchQuery]);

  // -------------------------------------------------------------
  // Toggle Active Direct Actions
  // -------------------------------------------------------------
  const handleToggleStateActive = async (state: StateItem, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const nextState = !state.isActive;
    const updatedStates = states.map((s) => (s.id === state.id ? { ...s, isActive: nextState } : s));
    setStates(updatedStates);
    setCachedData("locations:states", updatedStates);

    try {
      await updateState(state.id, { isActive: nextState });
      notify(`${state.name} is now ${nextState ? "Active" : "Disabled"}.`);
    } catch (err) {
      const reverted = states.map((s) => (s.id === state.id ? { ...s, isActive: !nextState } : s));
      setStates(reverted);
      setCachedData("locations:states", reverted);
      const msg = err instanceof Error ? err.message : "Failed to update state status";
      notify(msg, "error");
    }
  };

  const handleToggleCityActive = async (city: CityItem, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const nextState = !city.isActive;
    const updatedCities = cities.map((c) => (c.id === city.id ? { ...c, isActive: nextState } : c));
    setCities(updatedCities);
    if (selectedStateId) {
      setCachedData(`locations:cities:${selectedStateId}`, updatedCities);
    }

    try {
      await updateCity(city.id, { isActive: nextState }, selectedStateId || undefined);
      notify(`${city.name} is now ${nextState ? "Active" : "Disabled"}.`);
    } catch (err) {
      const reverted = cities.map((c) => (c.id === city.id ? { ...c, isActive: !nextState } : c));
      setCities(reverted);
      if (selectedStateId) {
        setCachedData(`locations:cities:${selectedStateId}`, reverted);
      }
      const msg = err instanceof Error ? err.message : "Failed to update city status";
      notify(msg, "error");
    }
  };

  const handleToggleAreaActive = async (area: AreaItem, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const nextState = !area.isActive;
    const updatedAreas = areas.map((a) => (a.id === area.id ? { ...a, isActive: nextState } : a));
    setAreas(updatedAreas);
    if (selectedCityId) {
      setCachedData(`locations:areas:${selectedCityId}`, updatedAreas);
    }

    try {
      await updateArea(area.id, { isActive: nextState }, selectedCityId || undefined);
      notify(`${area.name} (${area.pincode}) is now ${nextState ? "Active" : "Disabled"}.`);
    } catch (err) {
      const reverted = areas.map((a) => (a.id === area.id ? { ...a, isActive: !nextState } : a));
      setAreas(reverted);
      if (selectedCityId) {
        setCachedData(`locations:areas:${selectedCityId}`, reverted);
      }
      const msg = err instanceof Error ? err.message : "Failed to update area status";
      notify(msg, "error");
    }
  };

  // -------------------------------------------------------------
  // State CRUD
  // -------------------------------------------------------------
  const handleOpenAddState = () => {
    setEditingState(null);
    setStateFormName("");
    setStateFormActive(true);
    setStateModalOpen(true);
  };

  const handleOpenEditState = (state: StateItem, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setEditingState(state);
    setStateFormName(state.name);
    setStateFormActive(state.isActive);
    setStateModalOpen(true);
  };

  const handleSaveState = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stateFormName.trim()) return;
    setIsSubmitting(true);
    try {
      if (editingState) {
        const updated = await updateState(editingState.id, {
          name: stateFormName.trim(),
          isActive: stateFormActive,
        });
        const updatedStates = states.map((s) => (s.id === editingState.id ? updated : s));
        setStates(updatedStates);
        setCachedData("locations:states", updatedStates);
        notify(`State "${updated.name}" updated successfully.`);
      } else {
        const created = await createState(stateFormName.trim());
        const updatedStates = [...states, created];
        setStates(updatedStates);
        setCachedData("locations:states", updatedStates);
        setSelectedStateId(created.id);
        notify(`State "${created.name}" created successfully.`);
      }
      setStateModalOpen(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to save state";
      notify(msg, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // -------------------------------------------------------------
  // City CRUD
  // -------------------------------------------------------------
  const handleOpenAddCity = () => {
    if (!selectedStateId) {
      notify("Please select a state first", "error");
      return;
    }
    setEditingCity(null);
    setCityFormName("");
    setCityFormActive(true);
    setCityModalOpen(true);
  };

  const handleOpenEditCity = (city: CityItem, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setEditingCity(city);
    setCityFormName(city.name);
    setCityFormActive(city.isActive);
    setCityModalOpen(true);
  };

  const handleSaveCity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cityFormName.trim() || !selectedStateId) return;
    setIsSubmitting(true);
    try {
      if (editingCity) {
        const updated = await updateCity(
          editingCity.id,
          {
            name: cityFormName.trim(),
            isActive: cityFormActive,
          },
          selectedStateId
        );
        const updatedCities = cities.map((c) => (c.id === editingCity.id ? updated : c));
        setCities(updatedCities);
        setCachedData(`locations:cities:${selectedStateId}`, updatedCities);
        notify(`City "${updated.name}" updated successfully.`);
      } else {
        const created = await createCity(selectedStateId, cityFormName.trim());
        const updatedCities = [...cities, created];
        setCities(updatedCities);
        setCachedData(`locations:cities:${selectedStateId}`, updatedCities);
        setSelectedCityId(created.id);
        notify(`City "${created.name}" created successfully.`);
      }
      setCityModalOpen(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to save city";
      notify(msg, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // -------------------------------------------------------------
  // Area CRUD
  // -------------------------------------------------------------
  const handleOpenAddArea = () => {
    if (!selectedCityId) {
      notify("Please select a city first", "error");
      return;
    }
    setEditingArea(null);
    setAreaFormName("");
    setAreaFormPincode("");
    setAreaFormActive(true);
    setAreaModalOpen(true);
  };

  const handleOpenEditArea = (area: AreaItem, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setEditingArea(area);
    setAreaFormName(area.name);
    setAreaFormPincode(area.pincode);
    setAreaFormActive(area.isActive);
    setAreaModalOpen(true);
  };

  const handleSaveArea = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!areaFormName.trim() || !areaFormPincode.trim() || !selectedCityId) return;
    setIsSubmitting(true);
    try {
      if (editingArea) {
        const updated = await updateArea(
          editingArea.id,
          {
            name: areaFormName.trim(),
            pincode: areaFormPincode.trim(),
            isActive: areaFormActive,
          },
          selectedCityId
        );
        const updatedAreas = areas.map((a) => (a.id === editingArea.id ? updated : a));
        setAreas(updatedAreas);
        setCachedData(`locations:areas:${selectedCityId}`, updatedAreas);
        notify(`Area "${updated.name}" updated successfully.`);
      } else {
        const created = await createArea(
          selectedCityId,
          areaFormName.trim(),
          areaFormPincode.trim()
        );
        const updatedAreas = [...areas, created];
        setAreas(updatedAreas);
        setCachedData(`locations:areas:${selectedCityId}`, updatedAreas);
        notify(`Area "${created.name}" created successfully.`);
      }
      setAreaModalOpen(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to save area";
      notify(msg, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // -------------------------------------------------------------
  // Delete & 409 Conflict Handling
  // -------------------------------------------------------------
  const handlePromptDelete = (
    type: "state" | "city" | "area",
    id: string,
    name: string,
    e?: React.MouseEvent
  ) => {
    e?.stopPropagation();
    setDeleteTarget({ type, id, name });
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    const { type, id, name } = deleteTarget;
    setIsSubmitting(true);

    try {
      if (type === "state") {
        await deleteState(id);
        const remaining = states.filter((s) => s.id !== id);
        setStates(remaining);
        setCachedData("locations:states", remaining);
        if (selectedStateId === id) {
          setSelectedStateId(remaining.length > 0 ? remaining[0].id : null);
        }
        notify(`State "${name}" deleted.`);
      } else if (type === "city") {
        await deleteCity(id, selectedStateId || undefined);
        const remaining = cities.filter((c) => c.id !== id);
        setCities(remaining);
        if (selectedStateId) {
          setCachedData(`locations:cities:${selectedStateId}`, remaining);
        }
        if (selectedCityId === id) {
          setSelectedCityId(remaining.length > 0 ? remaining[0].id : null);
        }
        notify(`City "${name}" deleted.`);
      } else if (type === "area") {
        await deleteArea(id, selectedCityId || undefined);
        const remaining = areas.filter((a) => a.id !== id);
        setAreas(remaining);
        if (selectedCityId) {
          setCachedData(`locations:areas:${selectedCityId}`, remaining);
        }
        notify(`Area "${name}" deleted.`);
      }
      setDeleteTarget(null);
    } catch (err) {
      setDeleteTarget(null);

      // Check if 409 Conflict or dependent records error
      const isConflict =
        (err instanceof ApiError && err.statusCode === 409) ||
        (err instanceof Error &&
          (err.message.toLowerCase().includes("conflict") ||
            err.message.toLowerCase().includes("dependent") ||
            err.message.toLowerCase().includes("address") ||
            err.message.toLowerCase().includes("cannot delete")));

      if (isConflict) {
        const errorMsg =
          err instanceof Error
            ? err.message
            : "Location has dependent records or customer addresses exist. Disable it instead.";
        setConflictInfo({
          type,
          id,
          name,
          message: errorMsg,
        });
      } else {
        const msg = err instanceof Error ? err.message : "Failed to delete location record";
        notify(msg, "error");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDisableInstead = async () => {
    if (!conflictInfo) return;
    const { type, id, name } = conflictInfo;
    setIsSubmitting(true);

    try {
      if (type === "state") {
        await updateState(id, { isActive: false });
        const updated = states.map((s) => (s.id === id ? { ...s, isActive: false } : s));
        setStates(updated);
        setCachedData("locations:states", updated);
      } else if (type === "city") {
        await updateCity(id, { isActive: false }, selectedStateId || undefined);
        const updated = cities.map((c) => (c.id === id ? { ...c, isActive: false } : c));
        setCities(updated);
        if (selectedStateId) {
          setCachedData(`locations:cities:${selectedStateId}`, updated);
        }
      } else if (type === "area") {
        await updateArea(id, { isActive: false }, selectedCityId || undefined);
        const updated = areas.map((a) => (a.id === id ? { ...a, isActive: false } : a));
        setAreas(updated);
        if (selectedCityId) {
          setCachedData(`locations:areas:${selectedCityId}`, updated);
        }
      }
      notify(`"${name}" has been disabled instead of deleted.`);
      setConflictInfo(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to disable location";
      notify(msg, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Helper for computing Area status
  const getAreaStatus = (area: AreaItem) => {
    const isStateActive = selectedState?.isActive ?? false;
    const isCityActive = selectedCity?.isActive ?? false;

    if (!area.isActive) {
      return {
        label: "AREA INACTIVE",
        className: "bg-[#FF8E72] border border-black text-black font-mono font-bold text-xs px-2 py-0.5",
        status: "inactive",
      };
    }

    if (!isStateActive || !isCityActive) {
      return {
        label: "PARENT PAUSED",
        className: "bg-stone-200 border border-black text-stone-700 font-mono font-bold text-xs px-2 py-0.5",
        status: "parent_paused",
      };
    }

    return {
      label: "SERVICEABLE",
      className: "bg-[#B8E8B8] border border-black text-black font-mono font-bold text-xs px-2 py-0.5",
      status: "serviceable",
    };
  };

  return (
    <div className="space-y-6 pb-12">
      {/* ------------------------------------------------------------- */}
      {/* Top Header */}
      {/* ------------------------------------------------------------- */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b-2 border-black pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Layers className="h-6 w-6 stroke-[2.5]" />
            <h1 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-black">
              Serviceability & Location Zones
            </h1>
          </div>
          <p className="text-xs font-semibold text-stone-600 mt-1">
            Manage active delivery coverage across States, Cities, and Postal Pincodes.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => fetchAllStates(true)}
            disabled={isLoadingStates}
            className="flex items-center gap-1.5"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 stroke-[2.5] ${isLoadingStates ? "animate-spin" : ""}`}
            />
            <span className="hidden sm:inline">Refresh</span>
          </Button>

          <Button
            onClick={handleOpenAddState}
            size="sm"
            className="bg-[#FFDF58] font-black border-2 border-black shadow-[3px_3px_0px_0px_#000000] hover:bg-[#FFD13B] flex items-center gap-1.5"
          >
            <Plus className="h-4 w-4 stroke-[3]" />
            <span>Add State</span>
          </Button>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* Hierarchy Rule Indicator Banner */}
      {/* ------------------------------------------------------------- */}
      <div className="border-2 border-black bg-white p-3 shadow-[3px_3px_0px_0px_#000000] flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 text-stone-800">
          <ShieldCheck className="h-4 w-4 stroke-[2.5] text-black shrink-0" />
          <span className="font-bold">
            Hierarchy Rule: An area is live for customers if and only if{" "}
            <span className="bg-[#B8E8B8] px-1.5 py-0.5 border border-black font-mono">State Active</span> +{" "}
            <span className="bg-[#B8E8B8] px-1.5 py-0.5 border border-black font-mono">City Active</span> +{" "}
            <span className="bg-[#B8E8B8] px-1.5 py-0.5 border border-black font-mono">Area Active</span>.
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0 font-mono text-[11px] font-bold">
          <span className="border border-black px-2 py-0.5 bg-[#FBF8EE]">
            {states.length} States
          </span>
          <span className="border border-black px-2 py-0.5 bg-[#FBF8EE]">
            {cities.length} Cities
          </span>
          <span className="border border-black px-2 py-0.5 bg-[#FBF8EE]">
            {areas.length} Hubs
          </span>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* Global Toast Alert */}
      {/* ------------------------------------------------------------- */}
      {toastMessage && (
        <div
          className={`flex items-center justify-between gap-3 border-2 border-black p-3.5 text-xs font-black shadow-[3px_3px_0px_0px_#000000] transition-all ${
            toastMessage.type === "error"
              ? "bg-[#FF8E72] text-black"
              : "bg-[#B8E8B8] text-black"
          }`}
        >
          <div className="flex items-center gap-2">
            {toastMessage.type === "error" ? (
              <AlertCircle className="h-4 w-4 stroke-[3]" />
            ) : (
              <CheckCircle2 className="h-4 w-4 stroke-[3]" />
            )}
            <span>{toastMessage.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            className="border border-black p-0.5 hover:bg-black/10"
          >
            <X className="h-3.5 w-3.5 stroke-[3]" />
          </button>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* Mobile Tab Switcher (< lg screens) */}
      {/* ------------------------------------------------------------- */}
      <div className="lg:hidden grid grid-cols-3 gap-2 border-2 border-black bg-white p-1.5 shadow-[3px_3px_0px_0px_#000000]">
        <button
          type="button"
          onClick={() => setMobileTab("states")}
          className={`py-2 px-1 text-center font-black text-xs uppercase border-2 border-black transition-all ${
            mobileTab === "states"
              ? "bg-[#FFDF58] shadow-[2px_2px_0px_0px_#000000]"
              : "bg-stone-100 hover:bg-stone-200"
          }`}
        >
          1. States ({states.length})
        </button>
        <button
          type="button"
          onClick={() => setMobileTab("cities")}
          disabled={!selectedState}
          className={`py-2 px-1 text-center font-black text-xs uppercase border-2 border-black transition-all ${
            mobileTab === "cities"
              ? "bg-[#FFDF58] shadow-[2px_2px_0px_0px_#000000]"
              : "bg-stone-100 hover:bg-stone-200 disabled:opacity-40"
          }`}
        >
          2. Cities ({cities.length})
        </button>
        <button
          type="button"
          onClick={() => setMobileTab("areas")}
          disabled={!selectedCity}
          className={`py-2 px-1 text-center font-black text-xs uppercase border-2 border-black transition-all ${
            mobileTab === "areas"
              ? "bg-[#FFDF58] shadow-[2px_2px_0px_0px_#000000]"
              : "bg-stone-100 hover:bg-stone-200 disabled:opacity-40"
          }`}
        >
          3. Areas ({filteredAreas.length})
        </button>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 3-Tier Column Master-Detail Drilldown */}
      {/* ------------------------------------------------------------- */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* ========================================================= */}
        {/* COLUMN 1: STATES (w-full md:w-1/4 / lg:col-span-3) */}
        {/* ========================================================= */}
        <div
          className={`lg:col-span-3 flex flex-col border-2 border-black bg-white shadow-[4px_4px_0px_0px_#000000] ${
            mobileTab !== "states" ? "hidden lg:flex" : "flex"
          }`}
        >
          {/* Column Header */}
          <div className="flex items-center justify-between border-b-2 border-black bg-[#FBF8EE] p-3.5">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 stroke-[2.5]" />
              <h2 className="text-xs font-black uppercase tracking-tight text-black">
                1. States ({states.length})
              </h2>
            </div>
            <button
              type="button"
              onClick={handleOpenAddState}
              className="border-2 border-black bg-[#FFDF58] px-2 py-0.5 text-[11px] font-black uppercase shadow-[1.5px_1.5px_0px_0px_#000000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none transition-all"
            >
              + Add
            </button>
          </div>

          {/* State List Body */}
          <div className="p-3 space-y-2.5 max-h-[620px] overflow-y-auto">
            {isLoadingStates && states.length === 0 ? (
              // Vibrant Neo-Brutalist Skeletons for States
              Array.from({ length: 4 }).map((_, idx) => (
                <div
                  key={idx}
                  className="animate-pulse border-2 border-black bg-[#FFFDF7]/70 p-3 shadow-[2px_2px_0px_0px_#000000] space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div
                      className="h-4 bg-stone-300 border border-black/50"
                      style={{ width: `${60 + (idx % 3) * 15}%` }}
                    />
                    <div className="h-5 w-9 bg-[#B8E8B8]/30 border-2 border-black" />
                  </div>
                  <div className="pt-2 border-t border-black/15 flex items-center justify-between">
                    <div className="h-3.5 w-14 bg-stone-200 border border-black/30" />
                    <div className="flex items-center gap-1.5">
                      <div className="h-5 w-5 bg-stone-200 border border-black/30" />
                      <div className="h-5 w-5 bg-[#FF8E72]/30 border border-black/30" />
                    </div>
                  </div>
                </div>
              ))
            ) : states.length === 0 ? (
              <div className="border-2 border-dashed border-black p-5 text-center bg-[#FFFDF7]">
                <p className="text-xs font-bold text-stone-600 mb-3">
                  No states configured yet.
                </p>
                <Button
                  onClick={handleOpenAddState}
                  size="xs"
                  className="bg-[#FFDF58] font-black border-2 border-black shadow-[2px_2px_0px_0px_#000000]"
                >
                  + Add First State
                </Button>
              </div>
            ) : (
              states.map((st) => {
                const isSelected = st.id === selectedStateId;
                return (
                  <div
                    key={st.id}
                    onClick={() => {
                      setSelectedStateId(st.id);
                      setMobileTab("cities");
                    }}
                    className={`cursor-pointer border-2 border-black p-3 transition-all ${
                      isSelected
                        ? "bg-[#FFDF58] shadow-[3px_3px_0px_0px_#000000] translate-x-1"
                        : "bg-[#FFFDF7] shadow-[2px_2px_0px_0px_#000000] hover:bg-[#FFF8D6]"
                    }`}
                  >
                    {/* Top Row: Name & Active Switch */}
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-black uppercase tracking-tight text-black truncate">
                        {st.name}
                      </span>

                      {/* Neo-brutalist Direct Toggle Switch */}
                      <button
                        type="button"
                        role="switch"
                        aria-checked={st.isActive}
                        onClick={(e) => handleToggleStateActive(st, e)}
                        title={st.isActive ? "Click to Disable State" : "Click to Enable State"}
                        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer border-2 border-black transition-colors ${
                          st.isActive ? "bg-[#B8E8B8]" : "bg-stone-300"
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-3.5 w-3.5 transform border border-black bg-white transition duration-150 ease-in-out ${
                            st.isActive ? "translate-x-4 bg-black" : "translate-x-0"
                          }`}
                        />
                      </button>
                    </div>

                    {/* Bottom Row: Status Pill & Action Buttons */}
                    <div className="mt-2.5 pt-2 border-t border-black/20 flex items-center justify-between">
                      <span
                        className={`border border-black px-1.5 py-0.5 text-[9px] font-mono font-bold uppercase shadow-[1px_1px_0px_0px_#000000] ${
                          st.isActive
                            ? "bg-[#B8E8B8] text-black"
                            : "bg-stone-200 text-stone-700"
                        }`}
                      >
                        {st.isActive ? "ACTIVE" : "DISABLED"}
                      </span>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={(e) => handleOpenEditState(st, e)}
                          title="Edit State"
                          className="border border-black bg-white p-1 hover:bg-stone-100 transition-colors shadow-[1px_1px_0px_0px_#000000]"
                        >
                          <Pencil className="h-3 w-3" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => handlePromptDelete("state", st.id, st.name, e)}
                          title="Delete State"
                          className="border border-black bg-[#FF8E72] p-1 hover:bg-[#FF7250] transition-colors shadow-[1px_1px_0px_0px_#000000]"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                        <ChevronRight className="h-3.5 w-3.5 ml-0.5 text-stone-500" />
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ========================================================= */}
        {/* COLUMN 2: CITIES UNDER STATE (w-full md:w-1/3 / lg:col-span-4) */}
        {/* ========================================================= */}
        <div
          className={`lg:col-span-4 flex flex-col border-2 border-black bg-white shadow-[4px_4px_0px_0px_#000000] ${
            mobileTab !== "cities" ? "hidden lg:flex" : "flex"
          }`}
        >
          {/* Column Header */}
          <div className="flex items-center justify-between border-b-2 border-black bg-[#FBF8EE] p-3.5">
            <div className="flex items-center gap-2 truncate">
              <Building2 className="h-4 w-4 stroke-[2.5] shrink-0" />
              <h2 className="text-xs font-black uppercase tracking-tight text-black truncate">
                2. Cities in {selectedState ? selectedState.name : "..."}
              </h2>
            </div>
            {selectedState && (
              <button
                type="button"
                onClick={handleOpenAddCity}
                className="border-2 border-black bg-[#FFDF58] px-2 py-0.5 text-[11px] font-black uppercase shadow-[1.5px_1.5px_0px_0px_#000000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none transition-all shrink-0"
              >
                + Add City
              </button>
            )}
          </div>

          {/* City List Body */}
          <div className="p-3 space-y-2.5 max-h-[620px] overflow-y-auto">
            {!selectedState ? (
              <div className="py-12 text-center text-xs font-bold text-stone-500 flex flex-col items-center gap-2">
                <Navigation className="h-6 w-6 stroke-[2] text-stone-400" />
                <span>Select a state to view cities</span>
              </div>
            ) : isLoadingCities && cities.length === 0 ? (
              // Vibrant Neo-Brutalist Skeletons for Cities
              Array.from({ length: 4 }).map((_, idx) => (
                <div
                  key={idx}
                  className="animate-pulse border-2 border-black bg-[#FFFDF7]/70 p-3 shadow-[2px_2px_0px_0px_#000000] space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div
                      className="h-4 bg-stone-300 border border-black/50"
                      style={{ width: `${65 + (idx % 3) * 15}%` }}
                    />
                    <div className="h-5 w-9 bg-[#B8E8B8]/30 border-2 border-black" />
                  </div>
                  <div className="pt-2 border-t border-black/15 flex items-center justify-between">
                    <div className="h-3.5 w-16 bg-[#B8E8B8]/30 border border-black/30" />
                    <div className="flex items-center gap-1.5">
                      <div className="h-5 w-5 bg-stone-200 border border-black/30" />
                      <div className="h-5 w-5 bg-[#FF8E72]/30 border border-black/30" />
                    </div>
                  </div>
                </div>
              ))
            ) : cities.length === 0 ? (
              <div className="border-2 border-dashed border-black p-5 text-center bg-[#FFFDF7]">
                <p className="text-xs font-bold text-stone-600 mb-3">
                  No cities found in {selectedState.name}.
                </p>
                <Button
                  onClick={handleOpenAddCity}
                  size="xs"
                  className="bg-[#FFDF58] font-black border-2 border-black shadow-[2px_2px_0px_0px_#000000]"
                >
                  + Add First City
                </Button>
              </div>
            ) : (
              cities.map((city) => {
                const isSelected = city.id === selectedCityId;
                const isParentDisabled = !selectedState.isActive;
                return (
                  <div
                    key={city.id}
                    onClick={() => {
                      setSelectedCityId(city.id);
                      setMobileTab("areas");
                    }}
                    className={`cursor-pointer border-2 border-black p-3 transition-all ${
                      isSelected
                        ? "bg-[#FFDF58] shadow-[3px_3px_0px_0px_#000000] translate-x-1"
                        : "bg-[#FFFDF7] shadow-[2px_2px_0px_0px_#000000] hover:bg-[#FFF8D6]"
                    }`}
                  >
                    {/* Top Row: Name & Active Switch */}
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-black uppercase tracking-tight text-black truncate">
                        {city.name}
                      </span>

                      {/* Neo-brutalist Direct Toggle Switch */}
                      <button
                        type="button"
                        role="switch"
                        aria-checked={city.isActive}
                        onClick={(e) => handleToggleCityActive(city, e)}
                        title={city.isActive ? "Click to Disable City" : "Click to Enable City"}
                        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer border-2 border-black transition-colors ${
                          city.isActive ? "bg-[#B8E8B8]" : "bg-stone-300"
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-3.5 w-3.5 transform border border-black bg-white transition duration-150 ease-in-out ${
                            city.isActive ? "translate-x-4 bg-black" : "translate-x-0"
                          }`}
                        />
                      </button>
                    </div>

                    {/* Bottom Row: Status & Actions */}
                    <div className="mt-2.5 pt-2 border-t border-black/20 flex items-center justify-between">
                      {isParentDisabled ? (
                        <span className="border border-black px-1.5 py-0.5 text-[9px] font-mono font-bold uppercase bg-stone-200 text-stone-700 shadow-[1px_1px_0px_0px_#000000]">
                          STATE PAUSED
                        </span>
                      ) : (
                        <span
                          className={`border border-black px-1.5 py-0.5 text-[9px] font-mono font-bold uppercase shadow-[1px_1px_0px_0px_#000000] ${
                            city.isActive
                              ? "bg-[#B8E8B8] text-black"
                              : "bg-[#FF8E72] text-black"
                          }`}
                        >
                          {city.isActive ? "ACTIVE" : "DISABLED"}
                        </span>
                      )}

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={(e) => handleOpenEditCity(city, e)}
                          title="Edit City"
                          className="border border-black bg-white p-1 hover:bg-stone-100 transition-colors shadow-[1px_1px_0px_0px_#000000]"
                        >
                          <Pencil className="h-3 w-3" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => handlePromptDelete("city", city.id, city.name, e)}
                          title="Delete City"
                          className="border border-black bg-[#FF8E72] p-1 hover:bg-[#FF7250] transition-colors shadow-[1px_1px_0px_0px_#000000]"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                        <ChevronRight className="h-3.5 w-3.5 ml-0.5 text-stone-500" />
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ========================================================= */}
        {/* COLUMN 3: SERVICEABLE AREAS & PINCODES (flex-1 / lg:col-span-5) */}
        {/* ========================================================= */}
        <div
          className={`lg:col-span-5 flex flex-col border-2 border-black bg-white shadow-[4px_4px_0px_0px_#000000] ${
            mobileTab !== "areas" ? "hidden lg:flex" : "flex"
          }`}
        >
          {/* Column Header */}
          <div className="border-b-2 border-black bg-[#FBF8EE] p-3.5 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 truncate">
                <Navigation className="h-4 w-4 stroke-[2.5] shrink-0" />
                <h2 className="text-xs font-black uppercase tracking-tight text-black truncate">
                  3. Hubs in {selectedCity ? selectedCity.name : "..."}
                </h2>
              </div>
              {selectedCity && (
                <button
                  type="button"
                  onClick={handleOpenAddArea}
                  className="border-2 border-black bg-[#FFDF58] px-2.5 py-1 text-xs font-black uppercase shadow-[2px_2px_0px_0px_#000000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none transition-all shrink-0"
                >
                  + Add Area / PIN
                </button>
              )}
            </div>

            {/* Area Search Input */}
            {selectedCity && (
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-stone-500" />
                <Input
                  value={areaSearchQuery}
                  onChange={(e) => setAreaSearchQuery(e.target.value)}
                  placeholder="Filter by area name or 6-digit pincode..."
                  className="pl-8 pr-7 h-8 text-xs font-medium border-2 border-black bg-white"
                />
                {areaSearchQuery && (
                  <button
                    type="button"
                    onClick={() => setAreaSearchQuery("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-500 hover:text-black"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Area List Body */}
          <div className="p-3 space-y-2.5 max-h-[620px] overflow-y-auto">
            {!selectedCity ? (
              <div className="py-12 text-center text-xs font-bold text-stone-500 flex flex-col items-center gap-2">
                <MapPin className="h-6 w-6 stroke-[2] text-stone-400" />
                <span>Select a city to inspect its serviceable areas & pincodes</span>
              </div>
            ) : isLoadingAreas && areas.length === 0 ? (
              // Vibrant Neo-Brutalist Skeletons for Areas
              Array.from({ length: 5 }).map((_, idx) => (
                <div
                  key={idx}
                  className="animate-pulse border-2 border-black bg-[#FFFDF7]/70 p-3.5 shadow-[3px_3px_0px_0px_#000000] space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div className="space-y-1.5 flex-1">
                      <div className="flex items-center gap-2">
                        <div
                          className="h-4 bg-stone-300 border border-black/50"
                          style={{ width: `${55 + (idx % 3) * 15}%` }}
                        />
                        <div className="h-4 w-16 bg-white border border-black/50" />
                      </div>
                      <div className="h-2.5 w-24 bg-stone-200 border border-black/20" />
                    </div>
                    <div className="h-6 w-11 bg-[#B8E8B8]/30 border-2 border-black" />
                  </div>
                  <div className="pt-2.5 border-t border-black/15 flex items-center justify-between">
                    <div className="h-5 w-24 bg-[#B8E8B8]/40 border border-black shadow-[1px_1px_0px_0px_#000000]" />
                    <div className="flex items-center gap-2">
                      <div className="h-6 w-6 bg-white border border-black" />
                      <div className="h-6 w-6 bg-[#FF8E72]/40 border border-black" />
                    </div>
                  </div>
                </div>
              ))
            ) : filteredAreas.length === 0 ? (
              <div className="border-2 border-dashed border-black p-6 text-center bg-[#FFFDF7]">
                <p className="text-xs font-bold text-stone-600 mb-3">
                  {areaSearchQuery
                    ? `No areas matching "${areaSearchQuery}".`
                    : `No areas configured for ${selectedCity.name}.`}
                </p>
                <Button
                  onClick={handleOpenAddArea}
                  size="xs"
                  className="bg-[#FFDF58] font-black border-2 border-black shadow-[2px_2px_0px_0px_#000000]"
                >
                  + Add First Area / Pincode
                </Button>
              </div>
            ) : (
              filteredAreas.map((area) => {
                const statusInfo = getAreaStatus(area);
                return (
                  <div
                    key={area.id}
                    className="border-2 border-black bg-white p-3.5 shadow-[3px_3px_0px_0px_#000000] hover:bg-[#FFFDF7] transition-all"
                  >
                    {/* Top Row: Name, Pincode & Direct Switch */}
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-sm font-black uppercase tracking-tight text-black">
                            {area.name}
                          </h3>
                          <span className="font-mono font-bold bg-white border border-black px-2 py-0.5 text-xs shadow-[1px_1px_0px_0px_#000000]">
                            PIN {area.pincode}
                          </span>
                        </div>
                        <div className="text-[10px] font-mono text-stone-500 mt-0.5">
                          {selectedCity.name}, {selectedState?.name}
                        </div>
                      </div>

                      {/* Direct Toggle Switch without opening modal */}
                      <button
                        type="button"
                        role="switch"
                        aria-checked={area.isActive}
                        onClick={(e) => handleToggleAreaActive(area, e)}
                        title={area.isActive ? "Click to Disable Area" : "Click to Enable Area"}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer border-2 border-black transition-colors ${
                          area.isActive ? "bg-[#B8E8B8]" : "bg-stone-300"
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-4.5 w-4.5 transform border-2 border-black bg-white transition duration-150 ease-in-out ${
                            area.isActive ? "translate-x-5 bg-black" : "translate-x-0"
                          }`}
                        />
                      </button>
                    </div>

                    {/* Bottom Row: Status Pill & Actions */}
                    <div className="mt-3 pt-2.5 border-t border-black/20 flex items-center justify-between">
                      <span className={statusInfo.className}>
                        {statusInfo.label}
                      </span>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={(e) => handleOpenEditArea(area, e)}
                          title="Edit Area"
                          className="border border-black bg-white p-1.5 hover:bg-stone-100 transition-colors shadow-[1px_1px_0px_0px_#000000]"
                        >
                          <Pencil className="h-3 w-3" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => handlePromptDelete("area", area.id, area.name, e)}
                          title="Delete Area"
                          className="border border-black bg-[#FF8E72] p-1.5 hover:bg-[#FF7250] transition-colors shadow-[1px_1px_0px_0px_#000000]"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 1. ADD / EDIT STATE MODAL */}
      {/* ------------------------------------------------------------- */}
      <Dialog open={stateModalOpen} onOpenChange={setStateModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingState ? `Edit State: ${editingState.name}` : "Add New State"}
            </DialogTitle>
            <DialogDescription>
              States are the top level of delivery serviceability.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveState} className="space-y-4 py-2">
            <div>
              <label className="text-xs font-black uppercase text-black block mb-1">
                State Name *
              </label>
              <Input
                required
                value={stateFormName}
                onChange={(e) => setStateFormName(e.target.value)}
                placeholder="e.g. Maharashtra, Chhattisgarh"
                className="font-bold border-2 border-black"
              />
            </div>

            <div className="flex items-center gap-3 pt-2">
              <input
                type="checkbox"
                id="stateActiveCheck"
                checked={stateFormActive}
                onChange={(e) => setStateFormActive(e.target.checked)}
                className="h-4 w-4 border-2 border-black rounded-none text-black focus:ring-0 cursor-pointer"
              />
              <label
                htmlFor="stateActiveCheck"
                className="text-xs font-bold text-black cursor-pointer select-none"
              >
                Active for Deliveries
              </label>
            </div>

            <DialogFooter className="mt-4">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setStateModalOpen(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || !stateFormName.trim()}
                className="bg-[#FFDF58] font-black border-2 border-black shadow-[3px_3px_0px_0px_#000000]"
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-1.5">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving...
                  </span>
                ) : editingState ? (
                  "Update State"
                ) : (
                  "Create State"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ------------------------------------------------------------- */}
      {/* 2. ADD / EDIT CITY MODAL */}
      {/* ------------------------------------------------------------- */}
      <Dialog open={cityModalOpen} onOpenChange={setCityModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingCity ? `Edit City: ${editingCity.name}` : "Add New City"}
            </DialogTitle>
            <DialogDescription>
              Assign a city under{" "}
              <strong className="text-black font-black uppercase">
                {selectedState?.name}
              </strong>
              .
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveCity} className="space-y-4 py-2">
            <div>
              <label className="text-xs font-black uppercase text-black block mb-1">
                Parent State
              </label>
              <div className="border-2 border-black bg-stone-100 px-3 py-1.5 text-xs font-mono font-bold text-black">
                {selectedState?.name || "None Selected"}
              </div>
            </div>

            <div>
              <label className="text-xs font-black uppercase text-black block mb-1">
                City Name *
              </label>
              <Input
                required
                value={cityFormName}
                onChange={(e) => setCityFormName(e.target.value)}
                placeholder="e.g. Pune, Raipur, Nagpur"
                className="font-bold border-2 border-black"
              />
            </div>

            <div className="flex items-center gap-3 pt-2">
              <input
                type="checkbox"
                id="cityActiveCheck"
                checked={cityFormActive}
                onChange={(e) => setCityFormActive(e.target.checked)}
                className="h-4 w-4 border-2 border-black rounded-none text-black focus:ring-0 cursor-pointer"
              />
              <label
                htmlFor="cityActiveCheck"
                className="text-xs font-bold text-black cursor-pointer select-none"
              >
                Active for Deliveries
              </label>
            </div>

            <DialogFooter className="mt-4">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setCityModalOpen(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || !cityFormName.trim()}
                className="bg-[#FFDF58] font-black border-2 border-black shadow-[3px_3px_0px_0px_#000000]"
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-1.5">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving...
                  </span>
                ) : editingCity ? (
                  "Update City"
                ) : (
                  "Create City"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ------------------------------------------------------------- */}
      {/* 3. ADD / EDIT AREA MODAL */}
      {/* ------------------------------------------------------------- */}
      <Dialog open={areaModalOpen} onOpenChange={setAreaModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingArea ? `Edit Area: ${editingArea.name}` : "Add Serviceable Area / PIN"}
            </DialogTitle>
            <DialogDescription>
              Configure doorstep delivery coverage for a specific postal pincode.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveArea} className="space-y-4 py-2">
            <div>
              <label className="text-xs font-black uppercase text-black block mb-1">
                Parent Hierarchy
              </label>
              <div className="border-2 border-black bg-stone-100 px-3 py-1.5 text-xs font-mono font-bold text-black">
                {selectedState?.name} ➔ {selectedCity?.name}
              </div>
            </div>

            <div>
              <label className="text-xs font-black uppercase text-black block mb-1">
                Area / Hub Name *
              </label>
              <Input
                required
                value={areaFormName}
                onChange={(e) => setAreaFormName(e.target.value)}
                placeholder="e.g. Kothrud, Shankar Nagar, Civil Lines"
                className="font-bold border-2 border-black"
              />
            </div>

            <div>
              <label className="text-xs font-black uppercase text-black block mb-1">
                Postal Pincode *
              </label>
              <Input
                required
                value={areaFormPincode}
                onChange={(e) => setAreaFormPincode(e.target.value)}
                placeholder="e.g. 411038 or 492001"
                maxLength={10}
                className="font-mono font-bold border-2 border-black"
              />
              <span className="text-[10px] text-stone-500 font-mono mt-1 block">
                Standard 6-digit Indian Postal Code
              </span>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <input
                type="checkbox"
                id="areaActiveCheck"
                checked={areaFormActive}
                onChange={(e) => setAreaFormActive(e.target.checked)}
                className="h-4 w-4 border-2 border-black rounded-none text-black focus:ring-0 cursor-pointer"
              />
              <label
                htmlFor="areaActiveCheck"
                className="text-xs font-bold text-black cursor-pointer select-none"
              >
                Active for Deliveries
              </label>
            </div>

            <DialogFooter className="mt-4">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setAreaModalOpen(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || !areaFormName.trim() || !areaFormPincode.trim()}
                className="bg-[#FFDF58] font-black border-2 border-black shadow-[3px_3px_0px_0px_#000000]"
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-1.5">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving...
                  </span>
                ) : editingArea ? (
                  "Update Area"
                ) : (
                  "Create Area"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ------------------------------------------------------------- */}
      {/* 4. CONFIRM DELETE MODAL */}
      {/* ------------------------------------------------------------- */}
      <Dialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-black">
              <AlertTriangle className="h-5 w-5 stroke-[2.5] text-[#FF8E72]" />
              <span>Delete Location Record</span>
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {deleteTarget?.type} &quot;
              <strong className="text-black font-black uppercase">
                {deleteTarget?.name}
              </strong>
              &quot;?
            </DialogDescription>
          </DialogHeader>

          <div className="p-3 border-2 border-black bg-[#FFFDF7] text-xs font-medium text-stone-700">
            If any customer addresses, orders, or child sub-locations depend on this
            record, the server will block deletion to prevent data corruption.
          </div>

          <DialogFooter className="mt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setDeleteTarget(null)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleConfirmDelete}
              disabled={isSubmitting}
              className="bg-[#FF8E72] hover:bg-[#FF7250] text-black font-black border-2 border-black shadow-[3px_3px_0px_0px_#000000]"
            >
              {isSubmitting ? (
                <span className="flex items-center gap-1.5">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Deleting...
                </span>
              ) : (
                "Confirm Delete"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ------------------------------------------------------------- */}
      {/* 5. 409 CONFLICT RESOLUTION MODAL */}
      {/* ------------------------------------------------------------- */}
      <Dialog
        open={Boolean(conflictInfo)}
        onOpenChange={(open) => {
          if (!open) setConflictInfo(null);
        }}
      >
        <DialogContent className="sm:max-w-md bg-[#FF8E72] border-[3px] border-black shadow-[6px_6px_0px_0px_#000000]">
          <DialogHeader className="border-b-2 border-black">
            <DialogTitle className="flex items-center gap-2 text-black">
              <AlertTriangle className="h-6 w-6 stroke-[3] text-black shrink-0" />
              <span>CANNOT DELETE LOCATION</span>
            </DialogTitle>
            <DialogDescription className="text-black font-bold text-xs">
              Dependent records or customer addresses exist.
            </DialogDescription>
          </DialogHeader>

          <div className="py-2 space-y-3">
            <div className="bg-white border-2 border-black p-3 text-xs font-bold text-black shadow-[2px_2px_0px_0px_#000000]">
              <p className="leading-relaxed">
                {conflictInfo?.message ||
                  `${conflictInfo?.type.toUpperCase()} "${conflictInfo?.name}" has active child records or customer delivery addresses. Disable it instead to halt deliveries without breaking historical records.`}
              </p>
            </div>
          </div>

          <DialogFooter className="mt-2 border-t-2 border-black pt-3 flex flex-col sm:flex-row gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setConflictInfo(null)}
              disabled={isSubmitting}
              className="border-2 border-black"
            >
              Close
            </Button>
            <Button
              type="button"
              onClick={handleDisableInstead}
              disabled={isSubmitting}
              className="bg-[#FFDF58] hover:bg-[#FFD13B] text-black font-black border-2 border-black shadow-[3px_3px_0px_0px_#000000]"
            >
              {isSubmitting ? (
                <span className="flex items-center gap-1.5">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Disabling...
                </span>
              ) : (
                "DISABLE INSTEAD"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
