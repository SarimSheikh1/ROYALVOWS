import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { api, useData, State, money, businessDate } from "./core";
export function EmployeeRecords() {
  const employees = useData("/admin/employees"),
    users = useData("/admin/users"),
    attendance = useData("/admin/attendance"),
    salaries = useData("/admin/salaries"),
    qc = useQueryClient();
  const [employee, setEmployee] = useState(""),
    [date, setDate] = useState(businessDate()),
    [present, setPresent] = useState(true),
    [period, setPeriod] = useState(businessDate().slice(0, 7)),
    [amount, setAmount] = useState(""),
    [reference, setReference] = useState(""),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  const employeeName = (id: string) => {
    const emp = employees.data?.find((e) => e._id === id);
    return users.data?.find((u) => u._id === emp?.user)?.name || "Employee";
  };
  async function save(path: string, body: unknown) {
    setBusy(true);
    try {
      await api(path, "POST", body);
      setMessage("Employee record saved.");
      await qc.invalidateQueries();
    } catch (e: any) {
      setMessage(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="panel">
      <h2>Attendance and salary history</h2>
      <State query={employees} />
      <label>
        Employee
        <select
          required
          value={employee}
          onChange={(e) => {
            setEmployee(e.target.value);
            const emp = employees.data?.find((r) => r._id === e.target.value);
            setAmount(emp ? String(emp.salary / 100) : "");
          }}
        >
          <option value="">Choose employee</option>
          {employees.data
            ?.filter((e) => !e.archived)
            .map((e) => (
              <option key={e._id} value={e._id}>
                {employeeName(e._id)}
              </option>
            ))}
        </select>
      </label>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void save("/admin/attendance", { employee, date, present });
        }}
      >
        <h3>Daily attendance</h3>
        <label>
          Date
          <input
            required
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </label>
        <label>
          Attendance
          <select
            value={present ? "Present" : "Absent"}
            onChange={(e) => setPresent(e.target.value === "Present")}
          >
            <option>Present</option>
            <option>Absent</option>
          </select>
        </label>
        <button disabled={busy || !employee}>Record attendance</button>
      </form>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void save("/admin/salaries", {
            employee,
            period,
            amount: Math.round(Number(amount) * 100),
            reference,
            key: crypto.randomUUID(),
          });
        }}
      >
        <h3>Record salary payment</h3>
        <label>
          Salary period
          <input
            required
            type="month"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
          />
        </label>
        <label>
          Paid amount (PKR)
          <input
            required
            type="number"
            min="0.01"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </label>
        <label>
          Payment reference
          <input
            required
            minLength={3}
            maxLength={200}
            value={reference}
            onChange={(e) => setReference(e.target.value)}
          />
        </label>
        <button disabled={busy || !employee}>Record salary payment</button>
      </form>
      <p role="status">{message}</p>
      <h3>Attendance history</h3>
      <State query={attendance} />
      {attendance.data
        ?.filter((a) => !employee || a.employee === employee)
        .map((a) => (
          <p key={a._id}>
            {employeeName(a.employee)} - {a.date} -{" "}
            {a.present ? "Present" : "Absent"}
          </p>
        ))}
      <h3>Salary payment history</h3>
      <State query={salaries} />
      {salaries.data
        ?.filter((s) => !employee || s.employee === employee)
        .map((s) => (
          <p key={s._id}>
            {employeeName(s.employee)} - {s.period} - {money(s.amount)} -{" "}
            {s.reference}
          </p>
        ))}
    </section>
  );
}
