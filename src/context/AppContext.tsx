import React, { createContext, useContext, useState, useEffect } from "react";
import { 
  onAuthStateChanged, 
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  signInWithCustomToken,
  signInWithEmailAndPassword
} from "firebase/auth";
import { 
  collection, 
  onSnapshot, 
  doc, 
  setDoc, 
  updateDoc, 
  deleteDoc,
  query,
  where,
  addDoc,
  getDoc,
  getDocs
} from "firebase/firestore";
import { auth, db, handleFirestoreError, OperationType } from "../lib/firebase";
import { apiRequest } from "../lib/api";
import { 
  User, 
  SchoolSettings, 
  Student, 
  Staff, 
  BorrowingRecord, 
  HealthRecord, 
  Transaction, 
  Book, 
  Mark, 
  Product, 
  Expense,
  LeaveRequest,
  AttendanceRecord,
  FeeStructure,
  Vehicle,
  Route,
  TimetableEntry,
  AppNotification,
  Dormitory,
  DormRoom,
  DormAllocation
} from "../types";

interface AppContextType {
  schoolSettings: SchoolSettings;
  setSchoolSettings: (settings: Partial<SchoolSettings>) => Promise<void>;
  currentUser: User | null;
  students: Student[];
  addStudent: (student: Omit<Student, "id">) => Promise<void>;
  updateStudent: (id: string, data: Partial<Student>) => Promise<void>;
  deleteStudent: (id: string) => Promise<void>;
  users: User[];
  addUser: (user: Omit<User, "id">) => Promise<void>;
  updateUser: (id: string, data: Partial<User>) => Promise<void>;
  deleteUser: (id: string) => Promise<void>;
  borrowings: BorrowingRecord[];
  addBorrowing: (record: Omit<BorrowingRecord, "id">) => Promise<void>;
  updateBorrowing: (id: string, data: Partial<BorrowingRecord>) => Promise<void>;
  healthRecords: HealthRecord[];
  addHealthRecord: (record: Omit<HealthRecord, "id">) => Promise<void>;
  transactions: Transaction[];
  addTransaction: (record: Omit<Transaction, "id">) => Promise<void>;
  books: Book[];
  addBook: (book: Omit<Book, "id">) => Promise<void>;
  updateBook: (id: string, data: Partial<Book>) => Promise<void>;
  deleteBook: (id: string) => Promise<void>;
  marks: Mark[];
  addMark: (mark: Omit<Mark, "id">) => Promise<void>;
  updateMark: (id: string, data: Partial<Mark>) => Promise<void>;
  deleteMark: (id: string) => Promise<void>;
  products: Product[];
  addProduct: (product: Omit<Product, "id">) => Promise<void>;
  updateProduct: (id: string, data: Partial<Product>) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  expenses: Expense[];
  addExpense: (expense: Omit<Expense, "id">) => Promise<void>;
  updateExpense: (id: string, data: Partial<Expense>) => Promise<void>;
  deleteExpense: (id: string) => Promise<void>;
  staff: Staff[];
  addStaff: (member: Omit<Staff, "id">) => Promise<void>;
  updateStaff: (id: string, data: Partial<Staff>) => Promise<void>;
  deleteStaff: (id: string) => Promise<void>;
  leaveRequests: LeaveRequest[];
  addLeaveRequest: (request: Omit<LeaveRequest, "id">) => Promise<void>;
  updateLeaveRequest: (id: string, data: Partial<LeaveRequest>) => Promise<void>;
  attendanceRecords: AttendanceRecord[];
  addAttendanceRecord: (record: Omit<AttendanceRecord, "id">) => Promise<void>;
  feeStructures: FeeStructure[];
  addFeeStructure: (fee: Omit<FeeStructure, "id">) => Promise<void>;
  updateFeeStructure: (id: string, data: Partial<FeeStructure>) => Promise<void>;
  vehicles: Vehicle[];
  addVehicle: (vehicle: Omit<Vehicle, "id">) => Promise<void>;
  updateVehicle: (id: string, data: Partial<Vehicle>) => Promise<void>;
  deleteVehicle: (id: string) => Promise<void>;
  routes: Route[];
  addRoute: (route: Omit<Route, "id">) => Promise<void>;
  updateRoute: (id: string, data: Partial<Route>) => Promise<void>;
  deleteRoute: (id: string) => Promise<void>;
  timetableEntries: TimetableEntry[];
  getClassFees: (className: string) => number;
  addTimetableEntry: (entry: Omit<TimetableEntry, "id">) => Promise<void>;
  updateTimetableEntry: (id: string, data: Partial<TimetableEntry>) => Promise<void>;
  deleteTimetableEntry: (id: string) => Promise<void>;
  dormitories: Dormitory[];
  addDormitory: (dorm: Omit<Dormitory, "id">) => Promise<void>;
  updateDormitory: (id: string, data: Partial<Dormitory>) => Promise<void>;
  deleteDormitory: (id: string) => Promise<void>;
  dormRooms: DormRoom[];
  addDormRoom: (room: Omit<DormRoom, "id">) => Promise<void>;
  updateDormRoom: (id: string, data: Partial<DormRoom>) => Promise<void>;
  deleteDormRoom: (id: string) => Promise<void>;
  dormAllocations: DormAllocation[];
  allocateDorm: (allocation: Omit<DormAllocation, "id">) => Promise<void>;
  updateAllocation: (id: string, data: Partial<DormAllocation>) => Promise<void>;
  notifications: AppNotification[];
  addNotification: (notification: Omit<AppNotification, "id">) => Promise<void>;
  markNotificationRead: (id: string) => Promise<void>;
  login: () => Promise<void>;
  loginWithCredentials: (email: string, pass: string, role: string) => Promise<void>;
  logout: () => Promise<void>;
  isLoggingIn: boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const PRIMARY_CLASSES = ["Baby Class", "Middle Class", "Top Class", "P.1", "P.2", "P.3", "P.4", "P.5", "P.6", "P.7"];

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [schoolSettings, setSchoolSettingsState] = useState<SchoolSettings>({ 
    name: "EduSphere Academy", 
    logo: null,
    level: "Primary",
    classes: PRIMARY_CLASSES,
    currency: "UGX",
    academicYear: "2026/2027",
    gradingScale: [
      { min: 80, grade: "D1", comment: "Distinction 1" },
      { min: 75, grade: "D2", comment: "Distinction 2" },
      { min: 70, grade: "C3", comment: "Credit 3" },
      { min: 65, grade: "C4", comment: "Credit 4" },
      { min: 60, grade: "C5", comment: "Credit 5" },
      { min: 55, grade: "C6", comment: "Credit 6" },
      { min: 50, grade: "P7", comment: "Pass 7" },
      { min: 45, grade: "P8", comment: "Pass 8" },
      { min: 0, grade: "F9", comment: "Fail 9" },
    ]
  });
  const [students, setStudents] = useState<Student[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [borrowings, setBorrowings] = useState<BorrowingRecord[]>([]);
  const [healthRecords, setHealthRecords] = useState<HealthRecord[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [books, setBooks] = useState<Book[]>([]);
  const [marks, setMarks] = useState<Mark[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [feeStructures, setFeeStructures] = useState<FeeStructure[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [timetableEntries, setTimetableEntries] = useState<TimetableEntry[]>([]);
  const [dormitories, setDormitories] = useState<Dormitory[]>([]);
  const [dormRooms, setDormRooms] = useState<DormRoom[]>([]);
  const [dormAllocations, setDormAllocations] = useState<DormAllocation[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loading, setLoading] = useState(true);

  // Sync Auth
  useEffect(() => {
    localStorage.removeItem("edu_session");
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Find or create user record in Firestore
        const userDocRef = doc(db, "users", firebaseUser.uid);
        
        // Check if there's a record with this UID
        const docSnap = await getDoc(userDocRef);
        
        if (docSnap.exists()) {
          const unsubUser = onSnapshot(userDocRef, (snap) => {
            if (snap.exists()) setCurrentUser({ id: snap.id, ...snap.data() } as User);
          });
          setLoading(false);
          return () => unsubUser();
        } else {
          // If no UID record, check if there's a record with this email (pre-assigned by admin)
          const usersRef = collection(db, "users");
          const q = query(usersRef, where("email", "==", firebaseUser.email));
          const querySnapshot = await getDocs(q);
          
          if (!querySnapshot.empty) {
            const existingUser = querySnapshot.docs[0];
            const userData = existingUser.data() as User;
            // Migrate to UID-based record for future fast lookups
            await setDoc(userDocRef, {
              ...userData,
              id: firebaseUser.uid
            });
            setCurrentUser({ ...userData, id: firebaseUser.uid });
            // Optionally delete the old email-indexed record if it wasn't the same ID
            if (existingUser.id !== firebaseUser.uid) {
              await deleteDoc(existingUser.ref);
            }
          } else {
            // Fallback for bootstrap admin or default new user
            const isBootstrap = firebaseUser.email === "mwanjeg039@gmail.com";
            const defaultUser: User = {
              id: firebaseUser.uid,
              name: firebaseUser.displayName || "User",
              email: firebaseUser.email || "",
              role: isBootstrap ? "admin" : "teacher"
            };
            // Create the record
            await setDoc(userDocRef, defaultUser);
            setCurrentUser(defaultUser);
          }
          setLoading(false);
        }
      } else {
        setCurrentUser(null);
        setLoading(false);
      }
    });
    return unsubscribe;
  }, []);

  // Sync Firestore Data
  useEffect(() => {
    if (!currentUser) return;

    const unsubSettings = onSnapshot(doc(db, "settings", "school"), (doc) => {
      if (doc.exists()) setSchoolSettingsState(doc.data() as SchoolSettings);
    });

    const unsubStudents = onSnapshot(collection(db, "students"), (snapshot) => {
      setStudents(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Student)));
    });

    const unsubUsers = onSnapshot(collection(db, "users"), (snapshot) => {
      setUsers(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as User)));
    });

    const unsubBorrowings = onSnapshot(collection(db, "borrowings"), (snapshot) => {
      setBorrowings(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as BorrowingRecord)));
    });

    const unsubHealth = onSnapshot(collection(db, "healthRecords"), (snapshot) => {
      setHealthRecords(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as HealthRecord)));
    });

    const unsubTransactions = onSnapshot(collection(db, "transactions"), (snapshot) => {
      setTransactions(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Transaction)));
    });
    
    const unsubBooks = onSnapshot(collection(db, "books"), (snapshot) => {
      setBooks(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Book)));
    });

    const unsubMarks = onSnapshot(collection(db, "marks"), (snapshot) => {
      setMarks(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Mark)));
    });

    const unsubProducts = onSnapshot(collection(db, "inventory"), (snapshot) => {
      setProducts(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Product)));
    });

    const unsubExpenses = onSnapshot(collection(db, "expenses"), (snapshot) => {
      setExpenses(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Expense)));
    });

    const unsubStaff = onSnapshot(collection(db, "staff"), (snapshot) => {
      setStaff(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Staff)));
    });

    const unsubLeave = onSnapshot(collection(db, "leaveRequests"), (snapshot) => {
      setLeaveRequests(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as LeaveRequest)));
    });

    const unsubFees = onSnapshot(collection(db, "feeStructures"), (snapshot) => {
      setFeeStructures(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as FeeStructure)));
    });

    const unsubAttendance = onSnapshot(collection(db, "attendance"), (snapshot) => {
      setAttendanceRecords(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as AttendanceRecord)));
    });

    const unsubVehicles = onSnapshot(collection(db, "vehicles"), (snapshot) => {
      setVehicles(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Vehicle)));
    });

    const unsubRoutes = onSnapshot(collection(db, "routes"), (snapshot) => {
      setRoutes(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Route)));
    });

    const unsubTimetable = onSnapshot(collection(db, "timetable"), (snapshot) => {
      setTimetableEntries(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as TimetableEntry)));
    });

    const unsubDorms = onSnapshot(collection(db, "dormitories"), (snapshot) => {
      setDormitories(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Dormitory)));
    });

    const unsubRooms = onSnapshot(collection(db, "dormRooms"), (snapshot) => {
      setDormRooms(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as DormRoom)));
    });

    const unsubAllocations = onSnapshot(collection(db, "dormAllocations"), (snapshot) => {
      setDormAllocations(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as DormAllocation)));
    });

    const unsubNotifications = onSnapshot(query(collection(db, "notifications"), where("userId", "in", [currentUser.id, "all"])), (snapshot) => {
      setNotifications(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as AppNotification)));
    });

    return () => {
      unsubSettings();
      unsubStudents();
      unsubUsers();
      unsubBorrowings();
      unsubHealth();
      unsubTransactions();
      unsubBooks();
      unsubMarks();
      unsubProducts();
      unsubExpenses();
      unsubStaff();
      unsubLeave();
      unsubFees();
      unsubAttendance();
      unsubVehicles();
      unsubRoutes();
      unsubTimetable();
      unsubDorms();
      unsubRooms();
      unsubAllocations();
      unsubNotifications();
    };
  }, [currentUser]);

  const addTransaction = async (record: Omit<Transaction, "id">) => {
    try {
      await apiRequest<Transaction>("/api/transactions", {
        method: "POST",
        json: record,
      });
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, "transactions");
    }
  };

  const addBook = async (book: Omit<Book, "id">) => {
    try {
      await addDoc(collection(db, "books"), book);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, "books");
    }
  };

  const updateBook = async (id: string, data: Partial<Book>) => {
    try {
      await updateDoc(doc(db, "books", id), data);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `books/${id}`);
    }
  };

  const deleteBook = async (id: string) => {
    try {
      await deleteDoc(doc(db, "books", id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `books/${id}`);
    }
  };

  const addMark = async (mark: Omit<Mark, "id">) => {
    try {
      await addDoc(collection(db, "marks"), mark);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, "marks");
    }
  };

  const updateMark = async (id: string, data: Partial<Mark>) => {
    try {
      await updateDoc(doc(db, "marks", id), data);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `marks/${id}`);
    }
  };

  const deleteMark = async (id: string) => {
    try {
      await deleteDoc(doc(db, "marks", id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `marks/${id}`);
    }
  };

  const addProduct = async (product: Omit<Product, "id">) => {
    try {
      await addDoc(collection(db, "inventory"), product);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, "inventory");
    }
  };

  const updateProduct = async (id: string, data: Partial<Product>) => {
    try {
      await updateDoc(doc(db, "inventory", id), data);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `inventory/${id}`);
    }
  };

  const deleteProduct = async (id: string) => {
    try {
      await deleteDoc(doc(db, "inventory", id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `inventory/${id}`);
    }
  };

  const addExpense = async (expense: Omit<Expense, "id">) => {
    try {
      await apiRequest<Expense>("/api/expenses", {
        method: "POST",
        json: expense,
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, "expenses");
    }
  };

  const updateExpense = async (id: string, data: Partial<Expense>) => {
    try {
      await updateDoc(doc(db, "expenses", id), data);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `expenses/${id}`);
    }
  };

  const deleteExpense = async (id: string) => {
    try {
      await deleteDoc(doc(db, "expenses", id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `expenses/${id}`);
    }
  };

  const addStaff = async (member: Omit<Staff, "id">) => {
    try {
      await addDoc(collection(db, "staff"), member);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, "staff");
    }
  };

  const updateStaff = async (id: string, data: Partial<Staff>) => {
    try {
      await updateDoc(doc(db, "staff", id), data);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `staff/${id}`);
    }
  };

  const deleteStaff = async (id: string) => {
    try {
      await deleteDoc(doc(db, "staff", id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `staff/${id}`);
    }
  };

  const addLeaveRequest = async (request: Omit<LeaveRequest, "id">) => {
    try {
      await addDoc(collection(db, "leaveRequests"), request);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, "leaveRequests");
    }
  };

  const updateLeaveRequest = async (id: string, data: Partial<LeaveRequest>) => {
    try {
      await updateDoc(doc(db, "leaveRequests", id), data);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `leaveRequests/${id}`);
    }
  };

  const addFeeStructure = async (fee: Omit<FeeStructure, "id">) => {
    try {
      await addDoc(collection(db, "feeStructures"), fee);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, "feeStructures");
    }
  };

  const updateFeeStructure = async (id: string, data: Partial<FeeStructure>) => {
    try {
      await updateDoc(doc(db, "feeStructures", id), data);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `feeStructures/${id}`);
    }
  };

  const addAttendanceRecord = async (record: Omit<AttendanceRecord, "id">) => {
    try {
      await apiRequest<AttendanceRecord>("/api/attendance", {
        method: "POST",
        json: record,
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, "attendance");
    }
  };

  const addVehicle = async (vehicle: Omit<Vehicle, "id">) => {
    try {
      await addDoc(collection(db, "vehicles"), vehicle);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, "vehicles");
    }
  };

  const updateVehicle = async (id: string, data: Partial<Vehicle>) => {
    try {
      await updateDoc(doc(db, "vehicles", id), data);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `vehicles/${id}`);
    }
  };

  const deleteVehicle = async (id: string) => {
    try {
      await deleteDoc(doc(db, "vehicles", id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `vehicles/${id}`);
    }
  };

  const addRoute = async (route: Omit<Route, "id">) => {
    try {
      await addDoc(collection(db, "routes"), route);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, "routes");
    }
  };

  const updateRoute = async (id: string, data: Partial<Route>) => {
    try {
      await updateDoc(doc(db, "routes", id), data);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `routes/${id}`);
    }
  };

  const deleteRoute = async (id: string) => {
    try {
      await deleteDoc(doc(db, "routes", id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `routes/${id}`);
    }
  };

  const addTimetableEntry = async (entry: Omit<TimetableEntry, "id">) => {
    try {
      await addDoc(collection(db, "timetable"), entry);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, "timetable");
    }
  };

  const updateTimetableEntry = async (id: string, data: Partial<TimetableEntry>) => {
    try {
      await updateDoc(doc(db, "timetable", id), data);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `timetable/${id}`);
    }
  };

  const deleteTimetableEntry = async (id: string) => {
    try {
      await deleteDoc(doc(db, "timetable", id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `timetable/${id}`);
    }
  };

  const addDormitory = async (dorm: Omit<Dormitory, "id">) => {
    try {
      await addDoc(collection(db, "dormitories"), dorm);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, "dormitories");
    }
  };

  const updateDormitory = async (id: string, data: Partial<Dormitory>) => {
    try {
      await updateDoc(doc(db, "dormitories", id), data);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `dormitories/${id}`);
    }
  };

  const deleteDormitory = async (id: string) => {
    try {
      await deleteDoc(doc(db, "dormitories", id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `dormitories/${id}`);
    }
  };

  const addDormRoom = async (room: Omit<DormRoom, "id">) => {
    try {
      const docRef = await addDoc(collection(db, "dormRooms"), room);
      // Link to dorm
      const dorm = dormitories.find(d => d.id === room.dormId);
      if (dorm) {
        await updateDoc(doc(db, "dormitories", dorm.id), {
          rooms: [...(dorm.rooms || []), docRef.id]
        });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, "dormRooms");
    }
  };

  const updateDormRoom = async (id: string, data: Partial<DormRoom>) => {
    try {
      await updateDoc(doc(db, "dormRooms", id), data);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `dormRooms/${id}`);
    }
  };

  const deleteDormRoom = async (id: string) => {
    try {
      const room = dormRooms.find(r => r.id === id);
      if (room) {
        const dorm = dormitories.find(d => d.id === room.dormId);
        if (dorm) {
          await updateDoc(doc(db, "dormitories", dorm.id), {
            rooms: dorm.rooms.filter(rid => rid !== id)
          });
        }
      }
      await deleteDoc(doc(db, "dormRooms", id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `dormRooms/${id}`);
    }
  };

  const allocateDorm = async (allocation: Omit<DormAllocation, "id">) => {
    try {
      const docRef = await addDoc(collection(db, "dormAllocations"), allocation);
      // Update room occupants
      const room = dormRooms.find(r => r.id === allocation.roomId);
      if (room) {
        await updateDoc(doc(db, "dormRooms", room.id), {
          occupants: [...(room.occupants || []), allocation.studentId]
        });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, "dormAllocations");
    }
  };

  const updateAllocation = async (id: string, data: Partial<DormAllocation>) => {
    try {
      const oldAlloc = dormAllocations.find(a => a.id === id);
      await updateDoc(doc(db, "dormAllocations", id), data);
      
      if (data.status === "checked-out" && oldAlloc) {
        // Remove from room
        const room = dormRooms.find(r => r.id === oldAlloc.roomId);
        if (room) {
          await updateDoc(doc(db, "dormRooms", room.id), {
            occupants: room.occupants.filter(sid => sid !== oldAlloc.studentId)
          });
        }
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `dormAllocations/${id}`);
    }
  };

  const addNotification = async (notification: Omit<AppNotification, "id">) => {
    try {
      await addDoc(collection(db, "notifications"), notification);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, "notifications");
    }
  };

  const markNotificationRead = async (id: string) => {
    try {
      await updateDoc(doc(db, "notifications", id), { read: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `notifications/${id}`);
    }
  };

  const login = async () => {
    if (isLoggingIn) return;
    setIsLoggingIn(true);
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error: any) {
      console.error("Login failed", error);
      // If popup is blocked, we can't easily fallback to redirect here without more config,
      // but we should at least reset the loading state.
      if (error.code === 'auth/popup-blocked') {
        alert("Sign-in popup was blocked by your browser. Please allow popups for this site or open the app in a new tab.");
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  const loginWithCredentials = async (email: string, pass: string, role: string) => {
    setIsLoggingIn(true);
    try {
      try {
        const credential = await signInWithEmailAndPassword(auth, email, pass);
        const userDoc = await getDoc(doc(db, "users", credential.user.uid));
        const userData = userDoc.data() as User | undefined;

        if (!userDoc.exists() || userData?.role !== role) {
          await signOut(auth);
          throw new Error("No account found with this email and role.");
        }
      } catch (firebaseError) {
        await signOut(auth).catch(() => undefined);
        const { customToken } = await apiRequest<{ customToken: string }>("/api/auth/login", {
          method: "POST",
          json: { email, pass, role },
        });
        await signInWithCustomToken(auth, customToken);
      }
    } catch (err: any) {
      alert(err.message || "Credential login failed");
      throw err;
    } finally {
      setIsLoggingIn(false);
    }
  };

  const logout = async () => {
    try {
      localStorage.removeItem("edu_session");
      await signOut(auth);
      setCurrentUser(null);
    } catch (error) {
      console.error("Logout failed", error);
    }
  };

  const setSchoolSettings = async (settings: Partial<SchoolSettings>) => {
    try {
      // Ensure no undefined values are sent to Firestore
      const newSettings = {
        ...schoolSettings,
        ...settings,
        currency: settings.currency || schoolSettings.currency || "UGX",
        academicYear: settings.academicYear || schoolSettings.academicYear || "2026/2027",
        classFees: {
          ...(schoolSettings.classFees || {}),
          ...(settings.classFees || {})
        }
      };
      
      const cleanSettings = JSON.parse(JSON.stringify(newSettings));
      await setDoc(doc(db, "settings", "school"), cleanSettings);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, "settings/school");
    }
  };

  // Helper to get total expected fees for a student class
  const getClassFees = (className: string) => {
    return schoolSettings.classFees?.[className] || 0;
  };

  const addStudent = async (student: Omit<Student, "id">) => {
    try {
      await addDoc(collection(db, "students"), student);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, "students");
    }
  };

  const updateStudent = async (id: string, data: Partial<Student>) => {
    try {
      await updateDoc(doc(db, "students", id), data);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `students/${id}`);
    }
  };

  const deleteStudent = async (id: string) => {
    try {
      await deleteDoc(doc(db, "students", id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `students/${id}`);
    }
  };

  const addUser = async (user: Omit<User, "id">) => {
    try {
      await apiRequest<User>("/api/users", {
        method: "POST",
        json: user,
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, "users");
    }
  };

  const updateUser = async (id: string, data: Partial<User>) => {
    try {
      await apiRequest<User>(`/api/users/${id}`, {
        method: "PATCH",
        json: data,
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${id}`);
    }
  };

  const deleteUser = async (id: string) => {
    try {
      await apiRequest<{ success: boolean }>(`/api/users/${id}`, {
        method: "DELETE",
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `users/${id}`);
    }
  };

  const addBorrowing = async (record: Omit<BorrowingRecord, "id">) => {
    try {
      await addDoc(collection(db, "borrowings"), record);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, "borrowings");
    }
  };

  const updateBorrowing = async (id: string, data: Partial<BorrowingRecord>) => {
    try {
      await updateDoc(doc(db, "borrowings", id), data);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `borrowings/${id}`);
    }
  };

  const addHealthRecord = async (record: Omit<HealthRecord, "id">) => {
    try {
      await addDoc(collection(db, "healthRecords"), record);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, "healthRecords");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <AppContext.Provider value={{ 
      schoolSettings, 
      setSchoolSettings, 
      currentUser, 
      students, 
      addStudent,
      updateStudent,
      deleteStudent,
      users, 
      addUser,
      updateUser,
      deleteUser,
      borrowings,
      addBorrowing,
      updateBorrowing,
      healthRecords,
      addHealthRecord,
      transactions,
      addTransaction,
      books,
      addBook,
      updateBook,
      deleteBook,
      marks,
      addMark,
      updateMark,
      deleteMark,
      products,
      addProduct,
      updateProduct,
      deleteProduct,
      expenses,
      addExpense,
      updateExpense,
      deleteExpense,
      staff,
      addStaff,
      updateStaff,
      deleteStaff,
      leaveRequests,
      addLeaveRequest,
      updateLeaveRequest,
      attendanceRecords,
      addAttendanceRecord,
      feeStructures,
      addFeeStructure,
      updateFeeStructure,
      vehicles,
      addVehicle,
      updateVehicle,
      deleteVehicle,
      routes,
      addRoute,
      updateRoute,
      deleteRoute,
      timetableEntries,
      getClassFees,
      addTimetableEntry,
      updateTimetableEntry,
      deleteTimetableEntry,
      dormitories,
      addDormitory,
      updateDormitory,
      deleteDormitory,
      dormRooms,
      addDormRoom,
      updateDormRoom,
      deleteDormRoom,
      dormAllocations,
      allocateDorm,
      updateAllocation,
      notifications,
      addNotification,
      markNotificationRead,
      login,
      loginWithCredentials,
      logout,
      isLoggingIn
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error("useApp must be used within an AppProvider");
  }
  return context;
}
