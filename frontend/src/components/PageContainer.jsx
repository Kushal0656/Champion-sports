import Sidebar from "./Sidebar";

export default function PageContainer({ title, children }) {
  return (
    <div style={{ display: "flex" }}>
      <Sidebar />

      <div
        style={{
          flex: 1,
          padding: "30px",
        }}
      >
        <h1>{title}</h1>

        <hr />

        <div style={{ marginTop: "20px" }}>
          {children}
        </div>
      </div>
    </div>
  );
}