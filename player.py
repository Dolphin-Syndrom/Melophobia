from PIL import Image, ImageTk
import tkinter as tk
import os
import time
import tkinter.font as font

class MusicPlayerGUI:
    def __init__(self):
        self.window = tk.Tk()
        self.window.geometry('400x300')
        self.window.configure(bg='#1c1c1c')

        self.button_frame = tk.Frame(self.window, bg='#1c1c1c', bd=2, relief=tk.GROOVE, highlightthickness=3, highlightbackground='cyan')

        prev_icon = Image.open('prev.png').resize((20, 20))
        next_icon = Image.open('next.png').resize((20, 20))
        play_icon = Image.open('play.png').resize((20, 20))
        pause_icon = Image.open('pause.png').resize((20, 20))

        self.prev_photo = ImageTk.PhotoImage(prev_icon)
        self.next_photo = ImageTk.PhotoImage(next_icon)
        self.play_photo = ImageTk.PhotoImage(play_icon)
        self.pause_photo = ImageTk.PhotoImage(pause_icon)

        prev_button = tk.Button(self.button_frame, image=self.prev_photo, bg='#1c1c1c', highlightthickness=0)
        next_button = tk.Button(self.button_frame, image=self.next_photo, bg='#1c1c1c', highlightthickness=0)
        play_button = tk.Button(self.button_frame, image=self.play_photo, bg='#1c1c1c', highlightthickness=0)
        pause_button = tk.Button(self.button_frame, image=self.pause_photo, bg='#1c1c1c', highlightthickness=0)

        prev_button.pack(side='left', padx=5, pady=5)
        play_button.pack(side='left', padx=5, pady=5)
        pause_button.pack(side='left', padx=5, pady=5)
        next_button.pack(side='left', padx=5, pady=5)

        self.button_frame.pack(pady=10, padx=10)

        self.timer_label = tk.Label(self.button_frame, text='00:00', bg='#1c1c1c', fg='white')
        self.timer_label.pack(side='right', padx=5)
    
        self.window.mainloop()    

gui = MusicPlayerGUI()



































