import { AppError, assertFound } from "../domain/errors";
import type { TenantContext } from "../domain/tenancy";
import { withTransaction } from "../infrastructure/database";
import type { RecordData } from "../infrastructure/postgresRepository";

export class LibraryService {
  async issueBook(tenant: TenantContext, payload: RecordData) {
    return withTransaction(async (client) => {
      const bookResult = payload.bookId
        ? await client.query(`select * from books where id = $1 and "schoolId" = $2 for update`, [payload.bookId, tenant.schoolId])
        : await client.query(`select * from books where lower(title) = lower($1) and "schoolId" = $2 for update`, [payload.bookTitle, tenant.schoolId]);
      const book = assertFound(bookResult.rows[0], "Book not found");
      if (Number(book.available) <= 0) throw new AppError(409, "No available copies of this book");

      const result = await client.query(
        `insert into borrowings (
           "schoolId", "studentId", "studentName", "bookId", "bookTitle", "borrowDate", "dueDate", status
         ) values ($1, $2, $3, $4, $5, $6, $7, 'active')
         returning *`,
        [
          tenant.schoolId,
          payload.studentId,
          payload.studentName,
          book.id,
          book.title,
          payload.borrowDate,
          payload.dueDate,
        ],
      );
      await client.query(`update books set available = available - 1, "updatedAt" = now() where id = $1`, [book.id]);
      return result.rows[0];
    });
  }

  async updateLoan(tenant: TenantContext, id: string, payload: RecordData) {
    if (payload.status !== "returned") {
      return withTransaction(async (client) => {
        const result = await client.query(
          `update borrowings set status = coalesce($3, status), "updatedAt" = now()
           where id = $1 and "schoolId" = $2 returning *`,
          [id, tenant.schoolId, payload.status],
        );
        return assertFound(result.rows[0], "Borrowing record not found");
      });
    }

    return withTransaction(async (client) => {
      const loanResult = await client.query(
        `select * from borrowings where id = $1 and "schoolId" = $2 for update`,
        [id, tenant.schoolId],
      );
      const loan = assertFound(loanResult.rows[0], "Borrowing record not found");
      if (loan.status === "returned") return loan;

      const result = await client.query(
        `update borrowings set status = 'returned', "returnedAt" = now(), "updatedAt" = now()
         where id = $1 returning *`,
        [id],
      );
      if (loan.bookId) {
        await client.query(
          `update books set available = least(total, available + 1), "updatedAt" = now()
           where id = $1 and "schoolId" = $2`,
          [loan.bookId, tenant.schoolId],
        );
      }
      return result.rows[0];
    });
  }
}
