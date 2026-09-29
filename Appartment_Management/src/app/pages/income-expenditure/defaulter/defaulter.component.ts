import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { CommonModule } from '@angular/common';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

@Component({
  selector: 'app-defaulter',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './defaulter.component.html',
  styleUrls: ['./defaulter.component.css']
})
export class DefaulterComponent implements OnInit {

 defaultersGrouped: any[] = [];
  loading = true;
  error: string | null = null;
  expandedUser: string | null = null;

  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.getDefaulters();
  }

getDefaulters() {
  // First get both API calls
  this.loading = true;

  // Get defaulters list
  this.http.get<any>('https://www.nomad.org.in/rkt/api/rkt/GetDefaulterMaintenance').subscribe({
    next: (res) => {
      if (res.status === 200 && res.Data) {
        const groupedData = this.groupByUser(res.Data);

        // Now get owners list
        this.http.get<any>('https://www.nomad.org.in/rkt/api/rkt/GetAllUserProfile').subscribe({
          next: (ownerRes) => {
            if (ownerRes.status === 200 && ownerRes.Data && ownerRes.Data.owner) {
              const owners = ownerRes.Data.owner;

              // Merge owner names into grouped data
              this.defaultersGrouped = groupedData.map(defaulter => {
                const owner = owners.find((o: any) => o.user_id === defaulter.user_id);
                return {
                  ...defaulter,
                  owner_name: owner ? owner.name : 'Unknown'
                };
              });
            } else {
              this.defaultersGrouped = groupedData; // fallback without names
            }
            this.loading = false;
          },
          error: (err) => {
            console.error(err);
            this.defaultersGrouped = groupedData; // fallback without names
            this.loading = false;
          }
        });

      } else {
        this.loading = false;
      }
    },
    error: (err) => {
      this.error = 'Failed to load defaulters list';
      console.error(err);
      this.loading = false;
    }
  });
}


  groupByUser(data: any[]) {
    const grouped: { [key: string]: string[] } = {};
    data.forEach(item => {
      const userId = item.user_id;
      const month = new Date(item.missing_month).toLocaleString('default', { month: 'long', year: 'numeric' });
      if (!grouped[userId]) {
        grouped[userId] = [];
      }
      grouped[userId].push(month);
    });

    return Object.entries(grouped).map(([user_id, months]) => ({
      user_id,
      months
    }));
  }

  toggleUser(userId: string) {
    this.expandedUser = this.expandedUser === userId ? null : userId;
  }

exportToExcel(): void {
  // Flatten data so each month is its own row
  const exportData: any[] = [];
  this.defaultersGrouped.forEach(d => {
    d.months.forEach((month: string) => {
      exportData.push({
        'User ID': d.user_id,
        'Owner Name': d.owner_name || '',
        'Missing Month': month
      });
    });
  });

  const worksheet: XLSX.WorkSheet = XLSX.utils.json_to_sheet(exportData);
  const workbook: XLSX.WorkBook = { Sheets: { 'Defaulters': worksheet }, SheetNames: ['Defaulters'] };
  const excelBuffer: any = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });

  const data: Blob = new Blob([excelBuffer], { type: 'application/octet-stream' });
  saveAs(data, `Defaulters_${new Date().toISOString().split('T')[0]}.xlsx`);
}



exportToPDF(): void {
  const doc = new jsPDF();
  doc.setFontSize(16);
  doc.text('Defaulters List', 14, 15);

  // Flatten data so each month is its own row
  const flattenedData: any[] = [];
  this.defaultersGrouped.forEach(d => {
    d.months.forEach((month: string) => {
      flattenedData.push([
        d.user_id,
        d.owner_name || '',
        month
      ]);
    });
  });

  autoTable(doc, {
    head: [['User ID', 'Owner Name', 'Missing Month']],
    body: flattenedData,
    startY: 20,
    styles: { fontSize: 10 },
    headStyles: { fillColor: [41, 128, 185] }
  });

  doc.save(`Defaulters_${new Date().toISOString().split('T')[0]}.pdf`);
}


}