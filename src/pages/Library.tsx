import React, { useState } from "react";
import { 
  Book as BookIcon, 
  Search, 
  Plus, 
  History, 
  User, 
  Calendar,
  CheckCircle2,
  Clock,
  ArrowRightLeft,
  X
} from "lucide-react";
import { cn } from "../lib/utils";
import { useApp } from "../context/AppContext";
import { useToast } from "../context/ToastContext";

interface Book {
  id: string;
  title: string;
  author: string;
  category: string;
  isbn: string;
  available: number;
  total: number;
}

interface Borrowing {
  id: string;
  studentName: string;
  bookTitle: string;
  borrowDate: string;
  dueDate: string;
  status: "active" | "returned" | "overdue";
}

export default function Library() {
  const { students, borrowings, addBorrowing, updateBorrowing, books, addBook } = useApp();
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<"books" | "borrowing">("books");
  const [isBorrowModalOpen, setIsBorrowModalOpen] = useState(false);
  const [isBookModalOpen, setIsBookModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [studentSearch, setStudentSearch] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [showStudentSuggestions, setShowStudentSuggestions] = useState(false);
  const [lendingForm, setLendingForm] = useState({
    bookTitle: "",
    borrowDate: new Date().toISOString().split('T')[0],
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  });
  const [bookForm, setBookForm] = useState({
    title: "",
    author: "",
    category: "General",
    isbn: "",
    total: 1
  });

  // Small helper to seed books if empty - for demo purposes
  React.useEffect(() => {
    if (books.length === 0) {
      const mockBooks = [
        { title: "Advanced Mathematics", author: "Dr. Euler", category: "Science", isbn: "MATH-001", available: 5, total: 10 },
        { title: "Modern World History", author: "A. Toynbee", category: "Humanities", isbn: "HIST-002", available: 2, total: 5 },
        { title: "Introduction to Biology", author: "C. Darwin", category: "Science", isbn: "BIO-003", available: 0, total: 3 },
      ];
      mockBooks.forEach(b => addBook(b));
    }
  }, [books.length, addBook]);

  const filteredBooks = books.filter(b => 
    b.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    b.author.toLowerCase().includes(searchQuery.toLowerCase()) ||
    b.isbn.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const studentSuggestions = studentSearch.trim() 
    ? students.filter(s => s.name.toLowerCase().includes(studentSearch.toLowerCase())).slice(0, 5)
    : [];

  const handleAddBook = async (e: React.FormEvent) => {
    e.preventDefault();
    await addBook({
      ...bookForm,
      available: bookForm.total
    });
    setIsBookModalOpen(false);
    setBookForm({ title: "", author: "", category: "General", isbn: "", total: 1 });
  };

  const handleConfirmLending = async () => {
    if (!selectedStudentId || !lendingForm.bookTitle) {
      toast.warning("Please select a student and book title.");
      return;
    }

    const student = students.find(s => s.id === selectedStudentId);
    if (!student) return;

    const newBorrowing: any = {
      studentId: student.id,
      studentName: student.name,
      bookTitle: lendingForm.bookTitle,
      borrowDate: lendingForm.borrowDate,
      dueDate: lendingForm.dueDate,
      status: "active" as const
    };

    await addBorrowing(newBorrowing);
    setIsBorrowModalOpen(false);
    setStudentSearch("");
    setSelectedStudentId("");
    setLendingForm({
      bookTitle: "",
      borrowDate: new Date().toISOString().split('T')[0],
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    });
  };

  const handleReturn = async (id: string) => {
    await updateBorrowing(id, { status: "returned" as const });
  };

  return (
    <div className="space-y-6" onClick={() => setShowStudentSuggestions(false)}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Library Management</h2>
          <p className="text-gray-500 text-sm">Manage school inventory and student borrowings.</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => setIsBorrowModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 shadow-sm transition-all"
          >
            <ArrowRightLeft className="w-4 h-4" />
            New Lending
          </button>
          <button 
            onClick={() => setIsBookModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50 shadow-sm transition-all"
          >
            <Plus className="w-4 h-4 text-blue-600" />
            Add Book
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        <button 
          onClick={() => setActiveTab("books")}
          className={cn(
            "px-6 py-3 text-sm font-medium border-b-2 transition-colors",
            activeTab === "books" ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"
          )}
        >
          Book Inventory
        </button>
        <button 
          onClick={() => setActiveTab("borrowing")}
          className={cn(
            "px-6 py-3 text-sm font-medium border-b-2 transition-colors",
            activeTab === "borrowing" ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"
          )}
        >
          Active Borrowings
        </button>
      </div>

      {/* Search and Filters */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input 
          type="text" 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search items..." 
          className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
        />
      </div>

      {activeTab === "books" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredBooks.map(book => (
            <div key={book.id} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-blue-50 rounded-xl">
                  <BookIcon className="w-6 h-6 text-blue-600" />
                </div>
                <span className={cn(
                  "px-2 py-1 text-[10px] font-bold rounded-full uppercase",
                  book.available > 0 ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
                )}>
                  {book.available > 0 ? `${book.available} Available` : "Out of Stock"}
                </span>
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-1">{book.title}</h3>
              <p className="text-sm text-gray-500 mb-4">by {book.author}</p>
              
              <div className="space-y-3 pt-4 border-t border-gray-50">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-400">Category</span>
                  <span className="font-semibold text-gray-700">{book.category}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-400">ISBN</span>
                  <span className="font-semibold text-gray-700">{book.isbn}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-400">Total Stock</span>
                  <span className="font-semibold text-gray-700">{book.total}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Student</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Book Title</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Due Date</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {borrowings.map(item => (
                <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{item.studentName}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{item.bookTitle}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      {item.dueDate}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase",
                      item.status === "active" ? "bg-blue-50 text-blue-600" :
                      item.status === "overdue" ? "bg-rose-50 text-rose-600" : 
                      item.status === "returned" ? "bg-emerald-50 text-emerald-600" : "bg-gray-50 text-gray-600"
                    )}>
                      {item.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    {item.status !== "returned" && (
                      <button 
                        onClick={() => handleReturn(item.id)}
                        className="text-xs font-bold text-blue-600 hover:underline"
                      >
                        Confirm Return
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Book Modal */}
      {isBookModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 bg-blue-600 text-white flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold">Add New Book</h3>
                <p className="text-blue-100 text-xs">Register a new book in the inventory</p>
              </div>
              <button 
                onClick={() => setIsBookModalOpen(false)}
                className="p-2 hover:bg-white/10 rounded-full transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <form className="p-6 space-y-4" onSubmit={handleAddBook}>
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Book Title</label>
                <input 
                  type="text" 
                  value={bookForm.title}
                  onChange={(e) => setBookForm({ ...bookForm, title: e.target.value })}
                  placeholder="e.g. Physics for Beginners" 
                  className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" 
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Author</label>
                <input 
                  type="text" 
                  value={bookForm.author}
                  onChange={(e) => setBookForm({ ...bookForm, author: e.target.value })}
                  placeholder="e.g. Stephen Hawking" 
                  className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" 
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">Category</label>
                  <input 
                    type="text" 
                    value={bookForm.category}
                    onChange={(e) => setBookForm({ ...bookForm, category: e.target.value })}
                    placeholder="e.g. Science" 
                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" 
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">ISBN / Ref</label>
                  <input 
                    type="text" 
                    value={bookForm.isbn}
                    onChange={(e) => setBookForm({ ...bookForm, isbn: e.target.value })}
                    placeholder="e.g. PH-001" 
                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" 
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Total Copies</label>
                <input 
                  type="number" 
                  min="1"
                  value={bookForm.total}
                  onChange={(e) => setBookForm({ ...bookForm, total: parseInt(e.target.value) || 1 })}
                  className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" 
                  required
                />
              </div>
              <button 
                type="submit"
                className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl mt-6 hover:bg-blue-700 active:scale-95 transition-all"
              >
                Save to inventory
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Borrow Modal */}
      {isBorrowModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 bg-blue-600 text-white flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold">Lend a Book</h3>
                <p className="text-blue-100 text-xs">Record new library borrowing</p>
              </div>
              <button 
                onClick={() => setIsBorrowModalOpen(false)}
                className="p-2 hover:bg-white/10 rounded-full transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <form className="p-6 space-y-4" onSubmit={(e) => { e.preventDefault(); handleConfirmLending(); }}>
              <div className="space-y-1 relative" onClick={(e) => e.stopPropagation()}>
                <label className="text-sm font-medium text-gray-700">Student Name</label>
                <input 
                  type="text" 
                  value={studentSearch}
                  onChange={(e) => {
                    setStudentSearch(e.target.value);
                    setShowStudentSuggestions(true);
                  }}
                  onFocus={() => setShowStudentSuggestions(true)}
                  placeholder="Start typing name..." 
                  className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" 
                  required
                />
                
                {showStudentSuggestions && studentSuggestions.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl z-20 overflow-hidden">
                    {studentSuggestions.map(s => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => {
                          setStudentSearch(s.name);
                          setSelectedStudentId(s.id);
                          setShowStudentSuggestions(false);
                        }}
                        className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors border-b last:border-0 border-gray-50"
                      >
                        <p className="text-sm font-bold text-gray-900">{s.name}</p>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{s.reg} • {s.class}</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Book Title</label>
                <input 
                  type="text" 
                  value={lendingForm.bookTitle}
                  onChange={(e) => setLendingForm({ ...lendingForm, bookTitle: e.target.value })}
                  placeholder="Enter book title..." 
                  className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" 
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">Lending Date</label>
                  <input 
                    type="date" 
                    value={lendingForm.borrowDate}
                    onChange={(e) => setLendingForm({ ...lendingForm, borrowDate: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" 
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">Due Date</label>
                  <input 
                    type="date" 
                    value={lendingForm.dueDate}
                    onChange={(e) => setLendingForm({ ...lendingForm, dueDate: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" 
                    required
                  />
                </div>
              </div>
              <button 
                type="submit"
                className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl mt-6 hover:bg-blue-700 active:scale-95 transition-all"
              >
                Confirm Lending
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
