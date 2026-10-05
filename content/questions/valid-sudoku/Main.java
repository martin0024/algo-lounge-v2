import com.google.gson.Gson;
import com.google.gson.JsonArray;
import com.google.gson.JsonParser;

public class Main {
    public static void main(String[] args) throws Exception {
        JsonArray in = JsonParser.parseString(args[0]).getAsJsonArray();
        JsonArray jb = in.get(0).getAsJsonArray();
        char[][] board = new char[jb.size()][];
        for (int i = 0; i < jb.size(); i++) {
            JsonArray row = jb.get(i).getAsJsonArray();
            board[i] = new char[row.size()];
            for (int j = 0; j < row.size(); j++) board[i][j] = row.get(j).getAsString().charAt(0);
        }

        boolean result = new Solution().isValidSudoku(board);
        System.out.println(new Gson().toJson(result));
    }
}
